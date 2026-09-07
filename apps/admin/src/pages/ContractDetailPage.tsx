import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/UI';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient, type ContractDetail, type UpdateContractStatusRequest } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const contractStatusOptions = [
  { value: 'completed', label: 'Completed' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ContractDetailPage() {
  const { contractId } = useParams();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient.getContract(contractId)
      .then((response) => {
        if (!cancelled) {
          setContract(response.data);
          setStatus(response.data.status);
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
  }, [contractId]);

  const handleStatusUpdate = async () => {
    if (!contractId || !status) return;
    setStatusUpdating(true);

    const input: UpdateContractStatusRequest = {
      status: status as 'active' | 'completed' | 'defaulted' | 'cancelled',
      reason: reason || undefined,
    };

    try {
      const response = await apiClient.updateContractStatus(contractId, input);
      setContract(response.data);
    } catch {
      // ignore for now
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <>
      <Sidebar />
      <Header title="Contract details" subtitle="View and manage a single contract." />
      <MainLayout>
        <div className="space-y-6">
          <p className="text-sm text-slate-500">Use this page to review contract payment schedule and status.</p>

          <Card className="p-6">
            {loading ? (
              <p className="text-sm text-slate-500">Loading contract details…</p>
            ) : error ? (
              <p className="text-sm text-red-500">Unable to load contract details.</p>
            ) : contract ? (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-6">
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Contract</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{contract.contractNumber}</p>
                    <StatusBadge status={contract.status} className="mt-3" />
                    <p className="mt-4 text-sm text-slate-600">{typeof contract.metadata?.notes === 'string' ? contract.metadata.notes : 'No additional contract notes.'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Customer</p>
                        <p className="text-sm text-slate-900">{contract.customerName}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Device</p>
                        <p className="text-sm text-slate-900">{contract.deviceLabel ?? 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Remaining balance</p>
                        <p className="text-lg font-semibold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: contract.currency || 'NGN' }).format(Number(contract.remainingBalance))}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Installment amount</p>
                        <p className="text-lg font-semibold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: contract.currency || 'NGN' }).format(Number(contract.installmentAmount))}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                  <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Installment schedule</h2>
                    <div className="space-y-3">
                      {contract.installments.length === 0 ? (
                        <p className="text-sm text-slate-500">No installments recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {contract.installments.map((installment) => (
                            <div key={installment.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Installment {installment.sequenceNumber}</p>
                                  <p className="text-sm text-slate-500">Due {dateFormatter.format(new Date(installment.dueDate))}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: contract.currency || 'NGN' }).format(Number(installment.amountDue))}</p>
                                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{installment.status}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Status management</h2>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700">New status</label>
                        <select
                          id="status"
                          value={status}
                          onChange={(event) => setStatus(event.target.value)}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select status</option>
                          {contractStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-slate-700">Reason</label>
                        <textarea
                          id="reason"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={4}
                          placeholder="Optional explanation for status change"
                        />
                      </div>
                      <Button variant="primary" onClick={handleStatusUpdate} disabled={!status || statusUpdating}>
                        {statusUpdating ? 'Updating...' : 'Save status'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a contract from the list to view its details.</p>
            )}
          </Card>
        </div>
      </MainLayout>
    </>
  );
}
