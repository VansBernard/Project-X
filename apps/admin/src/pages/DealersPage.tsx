/**
 * Dealers Management Page
 */
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Form, FormField, SelectField } from '../components/Form';
import { useDealers } from '../lib/hooks';
import { useApp } from '../context/AppContext';
import * as Types from '../types';
import { StatusBadge } from '../components/StatusBadge';

export default function DealersPage() {
  const { dealers, loading, error, fetch, create, update, delete: deleteDealer } = useDealers();
  const { addNotification } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Types.Dealer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as const,
    tier: 'bronze' as const,
  });

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleOpenModal = (dealer?: Types.Dealer) => {
    if (dealer) {
      setEditingDealer(dealer);
      setFormData({
        name: dealer.name,
        email: dealer.email,
        phone: dealer.phone,
        status: dealer.status,
        tier: dealer.tier,
      });
    } else {
      setEditingDealer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        tier: 'bronze',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDealer) {
        await update(editingDealer.id, formData);
        addNotification('success', 'Dealer updated successfully');
      } else {
        await create(formData as any);
        addNotification('success', 'Dealer created successfully');
      }
      setIsModalOpen(false);
    } catch {
      addNotification('error', 'Failed to save dealer');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      try {
        await deleteDealer(id);
        addNotification('success', 'Dealer deleted successfully');
      } catch {
        addNotification('error', 'Failed to delete dealer');
      }
    }
  };

  const columns: Column<Types.Dealer>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'tier',
      label: 'Tier',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={String(value) as any} />,
    },
    {
      key: 'totalRevenue',
      label: 'Revenue',
      render: (value) => `$${Number(value).toLocaleString()}`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dealers"
        subtitle={`Managing ${dealers.length} dealers`}
        action={
          <Button onClick={() => handleOpenModal()}>
            + Add Dealer
          </Button>
        }
      />

      <Card>
        <DataTable
          columns={columns}
          data={dealers}
          loading={loading}
          error={error}
          onRowClick={(dealer) => handleOpenModal(dealer)}
          actions={(dealer) => (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleOpenModal(dealer)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(dealer.id)}>
                Delete
              </Button>
            </div>
          )}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={editingDealer ? 'Edit Dealer' : 'Add New Dealer'}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)}>
          <FormField
            label="Name"
            name="name"
            placeholder="Enter dealer name"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: String(value) })}
            required
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: String(value) })}
            required
          />
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={(value) => setFormData({ ...formData, phone: String(value) })}
          />
          <SelectField
            label="Tier"
            name="tier"
            value={formData.tier}
            onChange={(value) => setFormData({ ...formData, tier: value as any })}
            options={[
              { value: 'bronze', label: 'Bronze' },
              { value: 'silver', label: 'Silver' },
              { value: 'gold', label: 'Gold' },
              { value: 'platinum', label: 'Platinum' },
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as any })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}
