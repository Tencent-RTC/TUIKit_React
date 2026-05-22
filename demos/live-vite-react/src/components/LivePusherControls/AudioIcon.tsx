import styles from './LivePusherControls.module.scss';

interface AudioIconProps {
  audioVolume?: number;
  isMuted?: boolean;
  size?: number;
}

export default function AudioIcon(props: AudioIconProps) {
  const {
    audioVolume = 0,
    isMuted = false,
    size = 16,
  } = props;
  const scale = size / 24;
  const levelHeight = isMuted || !audioVolume ? '0%' : `${audioVolume * 4}%`;

  return (
    <span className={styles['audio-icon-container']} style={{ transform: `scale(${scale})` }}>
      <span className={styles['audio-level-container']}>
        <span className={styles['audio-level']} style={{ height: levelHeight }} />
      </span>
      {isMuted
        ? (
          <svg className={styles['audio-icon']} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.32448 17.3825C7.93362 17.603 8.57784 17.7502 9.24648 17.8136V19.9996H10.9465V17.7921C14.8339 17.3231 17.8465 14.0129 17.8465 9.99897V9.16564H16.1465V9.99897C16.1465 13.3955 13.393 16.149 9.99648 16.149C9.36855 16.149 8.7626 16.0549 8.19196 15.88L7.32448 17.3825ZM9.0467 14.3995C9.35288 14.4653 9.67064 14.4999 9.99648 14.4999C12.4818 14.4999 14.4965 12.4852 14.4965 9.99994V5C14.4965 4.98684 14.4964 4.97368 14.4963 4.96055L12.7965 7.90473V9.99994C12.7965 11.5463 11.5429 12.7999 9.99648 12.7999C9.98774 12.7999 9.97901 12.7999 9.97029 12.7998L9.0467 14.3995ZM7.19828 10.1011L6.0293 12.1258C5.68933 11.4927 5.49648 10.7689 5.49648 9.99995V5C5.49648 2.51472 7.5112 0.5 9.99648 0.5C10.8618 0.5 11.6701 0.744232 12.3561 1.16752L11.5054 2.64096C11.0699 2.36184 10.5521 2.2 9.99648 2.2C8.45009 2.2 7.19648 3.4536 7.19648 5V9.99995C7.19648 10.0338 7.19709 10.0675 7.19828 10.1011ZM5.10485 13.727L4.20053 15.2933C2.92473 13.8974 2.14648 12.0391 2.14648 9.99897V9.16564H3.84648V9.99897C3.84648 11.4006 4.31537 12.6927 5.10485 13.727Z"
              fill="currentColor"
            />
            <path d="M5.5 16.7939L14.5 1.20555" stroke="#ED414D" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
        : (
          <svg className={styles['audio-icon']} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.7965 5.00098V10.0009C12.7965 11.5473 11.5429 12.8009 9.99648 12.8009C8.45009 12.8009 7.19648 11.5473 7.19648 10.0009V5.00098C7.19648 3.45458 8.45009 2.20098 9.99648 2.20098C11.5429 2.20098 12.7965 3.45458 12.7965 5.00098ZM5.49648 5.00098C5.49648 2.5157 7.5112 0.500977 9.99648 0.500977C12.4818 0.500977 14.4965 2.5157 14.4965 5.00098V10.0009C14.4965 12.4862 12.4818 14.5009 9.99648 14.5009C7.5112 14.5009 5.49648 12.4862 5.49648 10.0009V5.00098ZM2.14648 9.16564V9.99897C2.14648 14.0814 5.26287 17.436 9.24648 17.8136V19.9996H10.9465V17.7921C14.8339 17.3231 17.8465 14.0129 17.8465 9.99897V9.16564H16.1465V9.99897C16.1465 13.3955 13.393 16.149 9.99648 16.149C6.59993 16.149 3.84648 13.3955 3.84648 9.99897V9.16564H2.14648Z"
              fill="currentColor"
            />
          </svg>
        )}
    </span>
  );
}
