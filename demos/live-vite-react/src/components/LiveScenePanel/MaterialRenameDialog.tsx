import { useState } from 'react';
import { Dialog, Input, useUIKit } from '@tencentcloud/uikit-base-component-react';
import type { MediaSource } from 'tuikit-atomicx-react';
import styles from './LiveScenePanel.module.scss';

interface MaterialRenameDialogProps {
  material: MediaSource;
  onClose: () => void;
  onRename: (name: string) => void;
}

export default function MaterialRenameDialog(props: MaterialRenameDialogProps) {
  const { material, onClose, onRename } = props;
  const { t } = useUIKit();
  const [materialName, setMaterialName] = useState(material.name);

  const handleConfirm = () => {
    const trimmedName = materialName.trim();
    if (!trimmedName || trimmedName === material.name) {
      onClose();
      return;
    }
    onRename(trimmedName);
  };

  return (
    <Dialog
      visible
      title={t('Rename')}
      confirmText={t('Save as new name')}
      cancelText={t('Cancel')}
      className={styles['material-rename-dialog']}
      onConfirm={handleConfirm}
      onCancel={onClose}
      onClose={onClose}
    >
      <div className={styles['rename-input-wrap']}>
        <Input
          spellcheck={false}
          maxLength={80}
          value={materialName}
          onChange={(event) => setMaterialName(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
