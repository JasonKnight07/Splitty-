import { useEffect, useState } from 'react'
import { Avatar, Button, Card, EmptyState, Screen, ScreenHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { newId } from '../lib/id'
import type { Contact, FriendGroup } from '../types'

export default function Contacts() {
  const { client } = useApp()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [newContactName, setNewContactName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    client.listContacts().then(setContacts)
    client.listGroups().then(setGroups)
  }, [client])

  async function addContact() {
    const name = newContactName.trim()
    if (!name || !client) return
    const contact: Contact = { id: newId(), name }
    await client.saveContact(contact)
    setContacts((cs) => [...cs, contact].sort((a, b) => a.name.localeCompare(b.name)))
    setNewContactName('')
  }

  async function removeContact(id: string) {
    if (!client) return
    await client.deleteContact(id)
    setContacts((cs) => cs.filter((c) => c.id !== id))
    setGroups((gs) => gs.map((g) => ({ ...g, contactIds: g.contactIds.filter((cid) => cid !== id) })))
  }

  async function addGroup() {
    const name = newGroupName.trim()
    if (!name || !client) return
    const group: FriendGroup = { id: newId(), name, contactIds: [] }
    await client.saveGroup(group)
    setGroups((gs) => [...gs, group].sort((a, b) => a.name.localeCompare(b.name)))
    setNewGroupName('')
    setEditingGroupId(group.id)
  }

  async function toggleGroupMember(group: FriendGroup, contactId: string) {
    if (!client) return
    const has = group.contactIds.includes(contactId)
    const next: FriendGroup = {
      ...group,
      contactIds: has ? group.contactIds.filter((id) => id !== contactId) : [...group.contactIds, contactId],
    }
    await client.saveGroup(next)
    setGroups((gs) => gs.map((g) => (g.id === group.id ? next : g)))
  }

  async function removeGroup(id: string) {
    if (!client) return
    await client.deleteGroup(id)
    setGroups((gs) => gs.filter((g) => g.id !== id))
  }

  return (
    <Screen>
      <ScreenHeader title="Contacts" subtitle="Save people once, start group bills instantly" />

      <h2 className="mb-2 text-lg font-bold text-ink-900">Groups</h2>
      {groups.length === 0 ? (
        <EmptyState icon="👥" title="No groups yet" subtitle="Group your regular people so starting a bill is one tap." />
      ) : (
        <div className="mb-3 space-y-2">
          {groups.map((g) => {
            const members = contacts.filter((c) => g.contactIds.includes(c.id))
            const isEditing = editingGroupId === g.id
            return (
              <Card key={g.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {members.length === 0 ? (
                        <span className="text-xs text-ink-400">No members yet</span>
                      ) : (
                        members.map((m) => <Avatar key={m.id} name={m.name} size="sm" />)
                      )}
                    </div>
                    <p className="font-bold text-ink-900">{g.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingGroupId(isEditing ? null : g.id)}
                      className="text-xs font-semibold text-brand-700"
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                    <button onClick={() => removeGroup(g.id)} className="text-xs font-semibold text-red-500">
                      Delete
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                    {contacts.length === 0 ? (
                      <p className="text-xs text-ink-400">Add a contact below first.</p>
                    ) : (
                      contacts.map((c) => {
                        const active = g.contactIds.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleGroupMember(g, c.id)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                              active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
                            }`}
                          >
                            <Avatar name={c.name} size="sm" />
                            {c.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      <div className="mb-8 flex gap-2">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="New group name, e.g. Friday crew"
          className="min-w-0 flex-1 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500"
        />
        <Button variant="secondary" onClick={addGroup}>
          Create
        </Button>
      </div>

      <h2 className="mb-2 text-lg font-bold text-ink-900">People</h2>
      {contacts.length === 0 ? (
        <EmptyState icon="🙋" title="No contacts yet" subtitle="Add people you often split bills with." />
      ) : (
        <div className="mb-3 space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} />
                <p className="font-medium text-ink-900">{c.name}</p>
              </div>
              <button onClick={() => removeContact(c.id)} className="text-xs font-semibold text-red-500">
                Remove
              </button>
            </Card>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={newContactName}
          onChange={(e) => setNewContactName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addContact()}
          placeholder="Add a contact"
          className="min-w-0 flex-1 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500"
        />
        <Button variant="secondary" onClick={addContact}>
          Add
        </Button>
      </div>
    </Screen>
  )
}
