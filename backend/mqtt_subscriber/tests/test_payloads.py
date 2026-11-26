import unittest
from datetime import datetime, timedelta, timezone

from workwell_mqtt.alerts import AlertTracker, evaluate
from workwell_mqtt.payloads import PayloadError, parse_alert, parse_environment, parse_status

NOW = datetime(2026, 11, 27, 10, 0, tzinfo=timezone.utc)
DEV = "device01"


class EnvironmentTests(unittest.TestCase):
    def test_full_payload(self):
        r = parse_environment(b'{"device_id":"device01","ts":"2026-11-27T09:59:58Z","temperature_c":23.4,'
                              b'"humidity_pct":48,"light_lux":435,"noise_dba":42.1,"seq":7}', DEV, NOW)
        self.assertEqual(r.values, {"temperature_c": 23.4, "humidity_pct": 48.0, "light_lux": 435.0, "noise_dba": 42.1})
        self.assertEqual(r.recorded_at, NOW - timedelta(seconds=2))
        self.assertIsNone(r.clock_note)
        self.assertEqual(r.to_row()["seq"], 7)

    def test_short_keys_and_epoch_ms(self):
        ms = int((NOW - timedelta(seconds=1)).timestamp() * 1000)
        r = parse_environment(f'{{"temp":22,"hum":50,"lux":300,"sound":40,"ts":{ms}}}'.encode(), DEV, NOW)
        self.assertEqual(r.recorded_at, NOW - timedelta(seconds=1))
        self.assertEqual(set(r.values), {"temperature_c", "humidity_pct", "light_lux", "noise_dba"})

    def test_unsynced_clock_falls_back_to_receive_time(self):
        r = parse_environment(b'{"temp":22,"ts":0}', DEV, NOW)  # ESP32 before NTP sync
        self.assertEqual(r.recorded_at, NOW)
        self.assertIsNotNone(r.clock_note)

    def test_partial_payload_ok(self):
        self.assertEqual(parse_environment(b'{"light_lux":120}', DEV, NOW).values, {"light_lux": 120.0})

    def test_rejections(self):
        bad = [b'', b'not json', b'[1,2]', b'{}', b'{"temp":"hot"}', b'{"temp":true}', b'{"temp":200}',
               b'{"hum":-1}', b'{"temp":NaN}', b'{"device_id":"device02","temp":22}', b'{"temp":22,"seq":-1}',
               b'{"temp":22}' + b' ' * 5000]
        for p in bad:
            with self.subTest(p=p[:40]):
                with self.assertRaises(PayloadError):
                    parse_environment(p, DEV, NOW)


class StatusAlertTests(unittest.TestCase):
    def test_lwt_string(self):
        self.assertEqual(parse_status(b"offline", DEV, NOW).status, "offline")

    def test_json_status(self):
        s = parse_status(b'{"status":"online","rssi":-61,"firmware":"v2.4.1","uptime_s":120,"ip":"192.168.1.20"}', DEV, NOW)
        self.assertEqual((s.status, s.rssi, s.firmware, s.uptime_s), ("online", -61, "v2.4.1", 120))

    def test_bad_status(self):
        with self.assertRaises(PayloadError):
            parse_status(b'{"status":"sleeping"}', DEV, NOW)

    def test_alert(self):
        a = parse_alert(b'{"sensor":"temperature","level":"critical","value":29.1,"threshold":26.5}', DEV)
        self.assertEqual((a.sensor, a.level, a.value), ("temp", "critical", 29.1))
        with self.assertRaises(PayloadError):
            parse_alert(b'{"sensor":"co2","level":"warning"}', DEV)


class AlertLogicTests(unittest.TestCase):
    T = {"max_temp_c": 26.5, "min_light_lux": 300, "max_humidity_pct": 60, "max_noise_dba": 58}

    def test_levels_match_frontend_rules(self):
        r = evaluate({"temperature_c": 26.5, "light_lux": 199, "humidity_pct": 60.5, "noise_dba": 66}, self.T)
        self.assertEqual(r["temp"]["level"], "ok")          # equal to max is not a violation
        self.assertEqual(r["light"]["level"], "critical")   # 101 lx below min
        self.assertEqual(r["hum"]["level"], "warning")
        self.assertEqual(r["sound"]["level"], "critical")   # +8 dBA

    def test_tracker_only_raises_on_escalation(self):
        t = AlertTracker()
        up = lambda v: t.update(evaluate({"temperature_c": v}, self.T))
        self.assertEqual(len(up(27.0)[0]), 1)   # ok -> warning
        self.assertEqual(len(up(27.2)[0]), 0)   # still warning: no duplicate
        self.assertEqual(len(up(28.5)[0]), 1)   # warning -> critical
        self.assertEqual(up(24.0)[1], ["temp"])  # recovered


if __name__ == "__main__":
    unittest.main()
