import dayjs from 'dayjs'
import { observer } from 'mobx-react-lite'
import * as Tooltip from '@radix-ui/react-tooltip'
import { FC, Fragment, useState } from 'react'
import { Input, IconSearch, Listbox, Button, Modal, Form, IconTrash, Badge } from 'ui'
import { useStore } from 'hooks'
import Divider from 'components/ui/Divider'

interface Props {}

const EncryptionKeysManagement: FC<Props> = ({}) => {
  const { vault, ui } = useStore()

  const [searchValue, setSearchValue] = useState<string>('')
  const [selectedSort, setSelectedSort] = useState<'comment' | 'created'>('created')
  const [showAddKeyModal, setShowAddKeyModal] = useState(false)
  const [selectedKeyToRemove, setSelectedKeyToRemove] = useState<any>()

  const [isDeletingKey, setIsDeletingKey] = useState(false)

  const keys = (
    searchValue
      ? vault.listKeys(
          (key: any) =>
            (key?.comment ?? '').toLowerCase().includes(searchValue.toLowerCase()) ||
            key.id.toLowerCase().includes(searchValue.toLowerCase())
        )
      : vault.listKeys()
  ).sort((a: any, b: any) => {
    if (selectedSort === 'created') {
      return Number(new Date(a.created)) - Number(new Date(b.created))
    } else {
      return a[selectedSort] > b[selectedSort] ? 1 : -1
    }
  })

  const addKey = async (values: any, { setSubmitting }: any) => {
    setSubmitting(true)
    const res = await vault.addKey(values.name)
    if (!res.error) {
      vault.load()
      ui.setNotification({ category: 'success', message: 'Successfully added new key' })
      setShowAddKeyModal(false)
    } else {
      ui.setNotification({
        error: res.error,
        category: 'error',
        message: `Failed to add new key: ${res.error.message}`,
      })
    }
    setSubmitting(false)
  }

  const confirmDeleteKey = async () => {
    if (!selectedKeyToRemove) return

    setIsDeletingKey(true)
    const res = await vault.deleteKey(selectedKeyToRemove.id)
    if (!res.error) {
      vault.load()
      ui.setNotification({ category: 'success', message: `Successfully deleted encryption key` })
      setSelectedKeyToRemove(undefined)
    } else {
      ui.setNotification({
        error: res.error,
        category: 'error',
        message: `Failed to delete encryption key: ${res.error.message}`,
      })
    }
    setIsDeletingKey(false)
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-scale-1200 mb-2 text-xl">Encryption Keys</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              className="w-64"
              size="small"
              placeholder="Search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              icon={<IconSearch strokeWidth={2} size={16} />}
            />
            <div className="w-32">
              <Listbox size="small" value={selectedSort} onChange={setSelectedSort}>
                <Listbox.Option id="comment" value="comment" label="Sort by name">
                  Name
                </Listbox.Option>
                <Listbox.Option id="created" value="created" label="Sort by created at">
                  Created at
                </Listbox.Option>
              </Listbox>
            </div>
          </div>
          <Button type="primary" onClick={() => setShowAddKeyModal(true)}>
            Add new key
          </Button>
        </div>

        {/* Table of secrets */}
        <div className="border border-scale-500 rounded">
          {keys.map((key, idx) => {
            return (
              <Fragment key={key.key_id}>
                <div className="px-6 py-4 flex items-center space-x-4">
                  <div className="space-y-1 min-w-[37%] max-w-[37%]">
                    <p className="text-sm truncate" title={key.comment || 'Unnamed'}>
                      {key.comment || 'Unnamed'}
                    </p>
                    <p
                      title={key.id}
                      className="text-sm text-scale-1000 font-mono font-bold truncate"
                    >
                      {key.id}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 w-[38%]">
                    {key.status === 'default' && <Badge color="green">Default</Badge>}
                  </div>
                  <div className="flex items-center justify-end w-[25%] space-x-4">
                    <p className="text-sm text-scale-1100">
                      Added on {dayjs(key.created).format('MMM D, YYYY')}
                    </p>
                    <Tooltip.Root delayDuration={0}>
                      <Tooltip.Trigger>
                        <Button
                          type="default"
                          className="py-2"
                          icon={<IconTrash />}
                          disabled={key.status === 'default'}
                          onClick={() => setSelectedKeyToRemove(key)}
                        />
                      </Tooltip.Trigger>
                      {key.status === 'default' && (
                        <Tooltip.Content side="bottom">
                          <Tooltip.Arrow className="radix-tooltip-arrow" />
                          <div
                            className={[
                              'rounded bg-scale-100 py-1 px-2 leading-none shadow',
                              'border border-scale-200',
                            ].join(' ')}
                          >
                            <span className="text-xs text-scale-1200">
                              The default key cannot be deleted
                            </span>
                          </div>
                        </Tooltip.Content>
                      )}
                    </Tooltip.Root>
                  </div>
                </div>
                {idx !== keys.length - 1 && <Divider light />}
              </Fragment>
            )
          })}
          {keys.length === 0 && (
            <>
              {searchValue.length === 0 ? (
                <div className="px-6 py-6 space-y-1 flex flex-col items-center justify-center">
                  <p className="text-sm text-scale-1200">No encryption keys added yet</p>
                  <p className="text-sm text-scale-1100">
                    Encryption keys are created by the pgsodium extension and can be used to encrypt
                    your columns and secrets
                  </p>
                </div>
              ) : (
                <div className="px-6 py-4 space-y-1">
                  <p className="text-sm text-scale-1200">No results found</p>
                  <p className="text-sm text-scale-1100">
                    Your search for "{searchValue}" did not return any results
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        closable
        size="small"
        alignFooter="right"
        visible={selectedKeyToRemove !== undefined}
        onCancel={() => setSelectedKeyToRemove(undefined)}
        onConfirm={confirmDeleteKey}
        loading={isDeletingKey}
        header={<h5 className="text-sm text-scale-1200">Confirm to delete encryption key</h5>}
      >
        <div className="py-4">
          <Modal.Content>
            <div className="space-y-4">
              <p className="text-sm">
                The following encryption key will be permanently removed and cannot be recovered.
                Are you sure?
              </p>
              <div className="space-y-1">
                <p className="text-sm">{selectedKeyToRemove?.comment ?? 'Unnamed'}</p>
                <p className="text-sm text-scale-1100">
                  ID: <span className="font-mono">{selectedKeyToRemove?.id}</span>
                </p>
              </div>
            </div>
          </Modal.Content>
        </div>
      </Modal>

      <Modal
        closable
        hideFooter
        size="medium"
        visible={showAddKeyModal}
        onCancel={() => setShowAddKeyModal(false)}
        header={<h5 className="text-sm text-scale-1200">Add new encryption key</h5>}
      >
        <Form id="add-new-key-form" initialValues={{ name: '' }} onSubmit={addKey}>
          {({ isSubmitting }: any) => {
            return (
              <div className="py-4">
                <Modal.Content>
                  <div className="space-y-4 pb-4">
                    <Input id="name" label="Name" labelOptional="Optional" />
                  </div>
                </Modal.Content>
                <Modal.Separator />
                <Modal.Content>
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      type="default"
                      disabled={isSubmitting}
                      onClick={() => setShowAddKeyModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button htmlType="submit" disabled={isSubmitting} loading={isSubmitting}>
                      Add key
                    </Button>
                  </div>
                </Modal.Content>
              </div>
            )
          }}
        </Form>
      </Modal>
    </>
  )
}

export default observer(EncryptionKeysManagement)
