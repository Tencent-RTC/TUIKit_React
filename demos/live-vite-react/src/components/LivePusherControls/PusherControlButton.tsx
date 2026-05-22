import classNames from 'classnames';
import styles from './LivePusherControls.module.scss';
import type { PusherControlButtonProps } from './types';

export default function PusherControlButton(props: PusherControlButtonProps) {
  const {
    disabled = false,
    dimmed = false,
    badge = 0,
    icon,
    label,
    onClick,
  } = props;

  const isDimmed = disabled || dimmed;

  return (
    <button
      type="button"
      className={classNames(styles['custom-icon-container'], {
        [styles.disabled]: isDimmed,
      })}
      // Only set the native `disabled` attribute for hard-disable; for
      // `dimmed` we want the click handler to still fire so the caller
      // can surface a toast (mirrors Vue3 OrientationSwitch behavior).
      disabled={disabled}
      onClick={onClick}
    >
      {badge > 0 && <span className={styles.badge}>{badge}</span>}
      {icon}
      <span className={styles['custom-text']}>{label}</span>
    </button>
  );
}
