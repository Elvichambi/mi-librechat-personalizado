import { useState, useId, useRef, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import * as Ariakit from '@ariakit/react';
import { Upload, Share2, Import } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { TStartupConfig } from 'librechat-data-provider';
import { DropdownPopup, TooltipAnchor, useMediaQuery, useToastContext } from '@librechat/client';
import type * as t from '~/common';
import { NotificationSeverity } from '~/common';
import ExportModal from '~/components/Nav/ExportConversation/ExportModal';
import { ShareButton } from '~/components/Conversations/ConvoOptions';
import { useLocalize } from '~/hooks';
import { startupConfigKey, useUploadConversationsMutation } from '~/data-provider';
import { logger } from '~/utils';
import store from '~/store';

export default function ExportAndShareMenu({
  isSharedButtonEnabled,
}: {
  isSharedButtonEnabled: boolean;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  const [showExports, setShowExports] = useState(false);
  const [isPopoverActive, setIsPopoverActive] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const menuId = useId();
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const conversation = useRecoilValue(store.conversationByIndex(0));

  const exportable =
    conversation &&
    conversation.conversationId != null &&
    conversation.conversationId !== 'new' &&
    conversation.conversationId !== 'search';

  const handleSuccess = useCallback(() => {
    showToast({
      message: localize('com_ui_import_conversation_success'),
      status: NotificationSeverity.SUCCESS,
    });
    setIsUploading(false);
  }, [localize, showToast]);

  const handleError = useCallback(
    (error: unknown) => {
      logger.error('Import error:', error);
      setIsUploading(false);

      const isUnsupportedType = error?.toString().includes('Unsupported import type');

      showToast({
        message: localize(
          isUnsupportedType
            ? 'com_ui_import_conversation_file_type_error'
            : 'com_ui_import_conversation_error',
        ),
        status: NotificationSeverity.ERROR,
      });
    },
    [localize, showToast],
  );

  const uploadFile = useUploadConversationsMutation({
    onSuccess: handleSuccess,
    onError: handleError,
    onMutate: () => {
      setIsUploading(true);
      showToast({
        message: localize('com_ui_importing'),
        status: NotificationSeverity.INFO,
      });
    },
  });

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const startupConfig = queryClient.getQueryData<TStartupConfig>(startupConfigKey(true));
        const maxFileSize = startupConfig?.conversationImportMaxFileSize;
        if (maxFileSize && file.size > maxFileSize) {
          const size = (maxFileSize / (1024 * 1024)).toFixed(2);
          showToast({
            message: localize('com_error_files_upload_too_large', { 0: size }),
            status: NotificationSeverity.ERROR,
          });
          setIsUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file, encodeURIComponent(file.name || 'File'));
        uploadFile.mutate(formData);
      } catch (error) {
        logger.error('File processing error:', error);
        setIsUploading(false);
        showToast({
          message: localize('com_ui_import_conversation_upload_error'),
          status: NotificationSeverity.ERROR,
        });
      }
    },
    [uploadFile, showToast, localize, queryClient],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setIsUploading(true);
        handleFileUpload(file);
      }
      event.target.value = '';
    },
    [handleFileUpload],
  );

  if (exportable === false) {
    return null;
  }

  const shareHandler = () => {
    setShowShareDialog(true);
  };

  const exportHandler = () => {
    setShowExports(true);
  };

  const importHandler = () => {
    fileInputRef.current?.click();
  };

  const dropdownItems: t.MenuItemProps[] = [
    {
      label: localize('com_ui_share'),
      onClick: shareHandler,
      icon: <Share2 className="icon-md mr-2 text-text-secondary" />,
      show: isSharedButtonEnabled,
      /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
      hideOnClick: false,
      ref: shareButtonRef,
      render: (props) => <button {...props} />,
    },
    {
      label: localize('com_endpoint_export'),
      onClick: exportHandler,
      icon: <Upload className="icon-md mr-2 text-text-secondary" />,
      /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
      hideOnClick: false,
      ref: exportButtonRef,
      render: (props) => <button {...props} />,
    },
    {
      label: localize('com_ui_import'),
      onClick: importHandler,
      icon: <Import className="icon-md mr-2 text-text-secondary" />,
      show: true,
      hideOnClick: true,
      render: (props) => <button {...props} />,
    },
  ];

  return (
    <>
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        unmountOnHide={true}
        isOpen={isPopoverActive}
        setIsOpen={setIsPopoverActive}
        trigger={
          <TooltipAnchor
            description={localize('com_endpoint_export_share')}
            render={
              <Ariakit.MenuButton
                id="export-menu-button"
                aria-label="Export options"
                disabled={isUploading}
                className="inline-flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-presentation text-text-primary transition-all ease-in-out hover:bg-surface-tertiary disabled:pointer-events-none disabled:opacity-50 radix-state-open:bg-surface-tertiary"
              >
                <Upload
                  className="icon-md text-text-primary"
                  aria-hidden="true"
                  focusable="false"
                />
              </Ariakit.MenuButton>
            }
          />
        }
        items={dropdownItems}
        className={isSmallScreen ? '' : 'absolute right-0 top-0 mt-2'}
      />
      <ExportModal
        open={showExports}
        onOpenChange={setShowExports}
        conversation={conversation}
        triggerRef={exportButtonRef}
        aria-label={localize('com_ui_export_convo_modal')}
      />
      <ShareButton
        triggerRef={shareButtonRef}
        conversationId={conversation.conversationId ?? ''}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".json"
        onChange={handleFileChange}
      />
    </>
  );
}
