import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/UI';
import { Modal } from '../components/Modal';
import { FormField, SelectField } from '../components/Form';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/TableSkeleton';
import {
  apiClient,
  type ContractListItem,
  type CustomerListItem,
  type DeviceListItem,
  type CreateContractRequest,
} from '../lib/api';
import noDataImg from '../../No data.jpg';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });


export function ContractsPage() {
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [dealerCurrency, setDealerCurrency] = useState("NGN");

  const [formState, setFormState] = useState<CreateContractRequest>({
    customerId: '',
    deviceId: undefined,
    contractNumber: '',
    currency: 'NGN',
    devicePrice: 0,
    deposit: 0,
    installmentAmount: 0,
    firstDueDate: new Date().toISOString().slice(0, 10),
    installmentCount: 12,
    metadata: {},
  });

  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient.listContracts({ take: 100 })
      .then((response) => {
        if (!cancelled) {
          setContracts(response.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    apiClient.getDealerProfile()
      .then((response) => setDealerCurrency(response.data.currency || "NGN"))
      .catch(() => setDealerCurrency("NGN"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient.searchCustomers({ take: 100 })
      .then((response) => {
        if (!cancelled) setCustomers(response.data);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });

    apiClient.listDevices({ take: 100 })
      .then((response) => {
        if (!cancelled) setDevices(response.data);
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      });

    return () => { cancelled = true; };
  }, []);

  const currentContracts = useMemo(
    () => contracts.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [contracts, page]
  );

  const pageCount = Math.max(1, Math.ceil(contracts.length / itemsPerPage));
  const navigate = useNavigate();

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await apiClient.createContract({
        ...formState,
        devicePrice: Number(formState.devicePrice),
        deposit: Number(formState.deposit),
        installmentAmount: Number(formState.installmentAmount),
        installmentCount: Number(formState.installmentCount),
      });

      setContracts((prev) => [response.data, ...prev]);
      setIsCreateOpen(false);
      navigate(`/contracts/${response.data.id}`);
    } catch (error) {
      setCreateError((error as Error)?.message || 'Failed to create contract.');
    } finally {
      setCreateLoading(false);
    }
  };


  return (
    <>
      <Sidebar />
      <Header title="Contracts" subtitle="Manage financing contracts and status updates." />
      <MainLayout>
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Contract list</p>
                <p className="text-sm text-slate-500">Showing {contracts.length} contract{contracts.length === 1 ? '' : 's'}.</p>
              </div>
              <p className="text-sm text-slate-700">Updated just now</p>
            </div>

            <div className="overflow-x-auto bg-white">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Contract</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Device</th>
                    <th className="px-5 py-3">Balance</th>
                    <th className="px-5 py-3">Next Due</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton columnCount={6} rowCount={5} />
                ) : error ? (
                  <tbody>
                    <tr>
                      <td className="px-5 py-10 text-center" colSpan={6}>
                        <p className="text-sm text-slate-500">Unable to load contracts. Please refresh and try again.</p>
                      </td>
                    </tr>
                  </tbody>
                ) : currentContracts.length === 0 ? (
                  <tbody>
                    <tr>
                      <td className="px-5 py-10 text-center" colSpan={6}>
                        <div className="flex flex-col items-center gap-4">
                          <img src={noDataImg} alt="No contracts" className="max-w-[280px] opacity-95" />
                          <p className="text-sm text-slate-500">No contracts available yet.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-slate-200 bg-slate-50">
                    {currentContracts.map((contract) => (
                      <tr
                        key={contract.id}
                        className="hover:bg-white transition-colors cursor-pointer"
                        onClick={() => navigate(`/contracts/${contract.id}`)}
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">{contract.contractNumber}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {contract.customer?.fullName
                            ?? [contract.customer?.firstName, contract.customer?.lastName].filter(Boolean).join(' ')
                            ?? contract.customerName
                            ?? 'Unknown'}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {contract.device?.serialNumber
                            ?? [contract.device?.manufacturer, contract.device?.model].filter(Boolean).join(' ')
                            ?? contract.deviceLabel
                            ?? 'Unassigned'}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: contract.currency || 'NGN' }).format(Number(contract.remainingBalance))}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{contract.nextDueDate ? dateFormatter.format(new Date(contract.nextDueDate)) : '—'}</td>
                        <td className="px-5 py-4"><StatusBadge status={contract.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <div>Showing {currentContracts.length} of {contracts.length} contracts</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2">Page {page} of {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
                  disabled={page === pageCount}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </Card>
        </div>
      </MainLayout>

      <Modal
        isOpen={isCreateOpen}
        title="Create new contract"
        onClose={() => setIsCreateOpen(false)}
        onConfirm={() => undefined}
        cancelText="Close"
        size="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <SelectField
            label="Customer"
            name="customerId"
            value={formState.customerId}
            onChange={(value) => setFormState((prev) => ({ ...prev, customerId: value }))}
            options={customers.map((customer) => ({ value: customer.id, label: customer.fullName ?? `${customer.firstName} ${customer.lastName}` }))}
          />
          <SelectField
            label="Device"
            name="deviceId"
            value={formState.deviceId ?? ''}
            onChange={(value) => setFormState((prev) => ({ ...prev, deviceId: value || undefined }))}
            options={[{ value: '', label: 'Unassigned' }, ...devices.map((device) => ({ value: device.id, label: device.serialNumber || `${device.manufacturer ?? ''} ${device.model ?? ''}`.trim() }))]}
          />
          <FormField
            label="Contract number"
            name="contractNumber"
            value={formState.contractNumber}
            onChange={(value) => setFormState((prev) => ({ ...prev, contractNumber: value }))}
            placeholder="Enter contract number"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="Device price"
              name="devicePrice"
              type="number"
              value={String(formState.devicePrice)}
              onChange={(value) => setFormState((prev) => ({ ...prev, devicePrice: Number(value) }))}
              placeholder="0.00"
            />
            <FormField
              label="Deposit"
              name="deposit"
              type="number"
              value={String(formState.deposit)}
              onChange={(value) => setFormState((prev) => ({ ...prev, deposit: Number(value) }))}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="Installment amount"
              name="installmentAmount"
              type="number"
              value={String(formState.installmentAmount)}
              onChange={(value) => setFormState((prev) => ({ ...prev, installmentAmount: Number(value) }))}
              placeholder="0.00"
            />
            <FormField
              label="Installment count"
              name="installmentCount"
              type="number"
              value={String(formState.installmentCount)}
              onChange={(value) => setFormState((prev) => ({ ...prev, installmentCount: Number(value) }))}
              placeholder="12"
            />
          </div>
          <FormField
            label="First due date"
            name="firstDueDate"
            type="date"
            value={formState.firstDueDate}
            onChange={(value) => setFormState((prev) => ({ ...prev, firstDueDate: value }))}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField
              label="Currency"
              name="currency"
              value={formState.currency}
              onChange={(value) => setFormState((prev) => ({ ...prev, currency: value }))}
              options={[{ value: dealerCurrency, label: dealerCurrency }]}
            />
            <FormField
              label="Metadata (JSON)"
              name="metadata"
              type="textarea"
              value={JSON.stringify(formState.metadata)}
              onChange={(value) => {
                try {
                  const parsed = JSON.parse(value || '{}');
                  setFormState((prev) => ({ ...prev, metadata: parsed }));
                } catch {
                  // ignore invalid JSON until user submits
                }
              }}
              placeholder='{"source":"admin"}'
            />
          </div>

          {createError ? <p className="text-sm text-red-500">{createError}</p> : null}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create contract'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
