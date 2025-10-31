import type React from 'react';
import { useLoginState, LoginStatus, useUIKit } from '@tencentcloud/chat-uikit-react';
import { useNavigate } from 'react-router-dom';
import { getEnabledScenes } from '../../config/scenes';
import styles from './HomePage.module.scss';

function HomePage() {
  const navigate = useNavigate();
  const { status } = useLoginState();
  const { t } = useUIKit();
  const products = getEnabledScenes();

  function goStages(sceneId: string) {
    if (status === LoginStatus.SUCCESS) {
      navigate(`/stages/${sceneId}`);
    } else {
      navigate(`/login/${sceneId}`);
    }
  }

  return (
    <div className={styles.home}>
      <header className={styles.hero}>
        <div className={styles.brand}>
          {t('page.home.brand')}
        </div>
        <h1 className={styles.headline}>
          {t('page.home.headline')}
        </h1>
        <p className={styles.sub}>
          {t('page.home.subtitle')}
        </p>
      </header>

      <section className={styles.grid}>
        {products.map(item => (
          <article
            key={item.key}
            className={styles.card}
            style={{ '--accent': item.accent } as React.CSSProperties}
          >
            <div className={styles.badge} />
            <h3>{t(item.title)}</h3>
            <p>{t(item.description)}</p>
            <button className={styles.enter} onClick={() => goStages(item.key)}>
              {t('page.home.enterExperience')}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

export {
  HomePage,
};
