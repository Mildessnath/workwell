# WorkWell MQTT Subscriber

HiveMQ Cloud (TLS) → payload validation → Supabase. Full setup: `../../docs/BACKEND_SETUP.md`.

```bash
pip install -r requirements.txt
cp .env.example .env        # fill in; never commit .env
python -m unittest discover -s tests -t .
python -m workwell_mqtt
```

Topics: `workwell/<DEVICE_ID>/environment | status | alerts`.
`tools/publish_sample.py` publishes simulated readings to test the pipeline without hardware.
