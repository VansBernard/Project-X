/**
 * Reports Generation Page
 */
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Form, FormField, SelectField } from '../components/Form';
import { DataTable, Column } from '../components/DataTable';
import { useReports } from '../lib/hooks';
import { useApp } from '../context/AppContext';
import * as Types from '../types';

export default function ReportsPage() {
  const { reports, loading, error, fetch, generate } = useReports();
  const { addNotification } = useApp();
  const [formData, setFormData] = useState({
    type: 'revenue',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      await generate(formData.type, [formData.startDate, formData.endDate]);
      addNotification('success', 'Report generated successfully');
    } catch {
      addNotification('error', 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const columns: Column<Types.Report>[] = [
    { key: 'title', label: 'Title', sortable: true },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      ),
    },
    {
      key: 'generatedAt',
      label: 'Generated',
      render: (value) => new Date(String(value)).toLocaleDateString(),
    },
    {
      key: 'format',
      label: 'Format',
      render: (value) => (
        <span className="px-2 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800 uppercase">
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`View and generate ${reports.length} reports`}
      />

      {/* Report Generator */}
      <Card>
        <CardHeader title="Generate Report" />
        <Form onSubmit={handleGenerateReport}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Report Type"
              name="type"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              options={[
                { value: 'revenue', label: 'Revenue Report' },
                { value: 'licenses', label: 'Licenses Report' },
                { value: 'devices', label: 'Devices Report' },
                { value: 'customers', label: 'Customers Report' },
                { value: 'contracts', label: 'Contracts Report' },
                { value: 'payments', label: 'Payments Report' },
              ]}
              required
            />
            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: String(value) })}
              required
            />
            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={(value) => setFormData({ ...formData, endDate: String(value) })}
              required
            />
          </div>
        </Form>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader title="Generated Reports" />
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          error={error}
          emptyMessage="No reports generated yet"
          actions={(report) => (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                Download {report.format.toUpperCase()}
              </Button>
              <Button size="sm" variant="secondary">
                View
              </Button>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
