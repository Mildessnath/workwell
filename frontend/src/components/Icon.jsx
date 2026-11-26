export default function Icon({ name, className = '', fill = false }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}>{name}</span>;
}
