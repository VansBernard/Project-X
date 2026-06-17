import { type FormEvent, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageHeader } from '../components/PageHeader';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  apiClient,
  type DeviceActiveLicenseResult,
  type LicenseDetail,
  type LicensePayload,
  type LicenseVerificationResult,
} from '../lib/api';

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function prettyDate(date?: string | null) {
  return date ? new Date(date).toLocaleString() : '-';
}

function DetailItem({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="break-all text-sm font-medium text-gray-900">{value === undefined || value === null || value === '' ? '-' : String(value)}</p>
    </div>
  );
}

function LicenseSummary({ license }: { license: LicenseDetail }) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem label="License ID" value={license.id} />
        <DetailItem label="Status" value={license.status} />
        <DetailItem label="Device ID" value={license.deviceId ?? license.device?.id} />
        <DetailItem label="Contract ID" value={license.contractId ?? license.contract?.id} />
        <DetailItem label="Issued" value={prettyDate(license.issuedAt)} />
        <DetailItem label="Expires" value={prettyDate(license.expiresAt)} />
      </div>

      <div>
        <p className="text-sm text-gray-500">Signed Payload</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs text-gray-700">
          {formatJson(license.signedPayload)}
        </pre>
      </div>

      <div>
        <p className="text-sm text-gray-500">Signature</p>
        <p className="mt-2 break-all rounded-lg bg-white p-3 text-xs text-gray-700">{license.signature || '-'}</p>
      </div>
    </div>
  );
}

function VerificationSummary({ result }: { result: LicenseVerificationResult }) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">Verification Result</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem label="Valid" value={result.valid ? 'Yes' : 'No'} />
        <DetailItem label="Signature Valid" value={result.signatureValid ? 'Yes' : 'No'} />
        <DetailItem label="Issued" value={result.issued ? 'Yes' : 'No'} />
        <DetailItem label="Not Expired" value={result.notExpired ? 'Yes' : 'No'} />
        <DetailItem label="Device ID" value={result.deviceId} />
        <DetailItem label="Contract ID" value={result.contractId} />
        <DetailItem label="Expires" value={prettyDate(result.expiresAt)} />
      </div>
    </div>
  );
}

function DeviceLicenseSummary({ result }: { result: DeviceActiveLicenseResult }) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem label="Unlock Allowed" value={result.unlockAllowed ? 'Yes' : 'No'} />
        <DetailItem label="License ID" value={result.license?.id} />
        <DetailItem label="Status" value={result.license?.status} />
        <DetailItem label="Expires" value={prettyDate(result.license?.expiresAt)} />
      </div>

      {result.verification && <VerificationSummary result={result.verification} />}
      {result.license && <LicenseSummary license={result.license} />}
    </div>
  );
}

export function LicensesPage() {
  const [issueDeviceId, setIssueDeviceId] = useState('');
  const [issueContractId, setIssueContractId] = useState('');
  const [issueExpiresAt, setIssueExpiresAt] = useState(() => {
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [issueMetadata, setIssueMetadata] = useState('{}');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuedLicense, setIssuedLicense] = useState<LicenseDetail | null>(null);

  const [lookupLicenseId, setLookupLicenseId] = useState('');
  const [lookupLicenseLoading, setLookupLicenseLoading] = useState(false);
  const [lookupLicenseError, setLookupLicenseError] = useState<string | null>(null);
  const [licenseDetail, setLicenseDetail] = useState<LicenseDetail | null>(null);

  const [deviceIdLookup, setDeviceIdLookup] = useState('');
  const [deviceLicenseLoading, setDeviceLicenseLoading] = useState(false);
  const [deviceLicenseError, setDeviceLicenseError] = useState<string | null>(null);
  const [deviceLicenseResult, setDeviceLicenseResult] = useState<DeviceActiveLicenseResult | null>(null);

  const [verifyPayload, setVerifyPayload] = useState('');
  const [verifySignature, setVerifySignature] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<LicenseVerificationResult | null>(null);

  const handleIssueLicense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIssueLoading(true);
    setIssueError(null);
    setIssuedLicense(null);

    let metadata: Record<string, unknown> = {};
    try {
      if (issueMetadata.trim()) {
        metadata = JSON.parse(issueMetadata);
      }
    } catch {
      setIssueError('Metadata must be valid JSON.');
      setIssueLoading(false);
      return;
    }

    try {
      const expiresAt = new Date(`${issueExpiresAt}T23:59:59.999Z`).toISOString();
      const response = await apiClient.issueLicense({
        deviceId: issueDeviceId.trim(),
        contractId: issueContractId.trim(),
        expiresAt,
        metadata,
      });

      setIssuedLicense(response.data);
      setIssueDeviceId('');
      setIssueContractId('');
      setIssueMetadata('{}');
    } catch (error) {
      setIssueError(getErrorMessage(error));
    } finally {
      setIssueLoading(false);
    }
  };

  const handleLookupLicense = async () => {
    setLookupLicenseLoading(true);
    setLookupLicenseError(null);
    setLicenseDetail(null);

    try {
      const response = await apiClient.getLicense(lookupLicenseId.trim());
      setLicenseDetail(response.data);
    } catch (error) {
      setLookupLicenseError(getErrorMessage(error));
    } finally {
      setLookupLicenseLoading(false);
    }
  };

  const handleLookupDeviceLicense = async () => {
    setDeviceLicenseLoading(true);
    setDeviceLicenseError(null);
    setDeviceLicenseResult(null);

    try {
      const response = await apiClient.getDeviceActiveLicense(deviceIdLookup.trim());
      setDeviceLicenseResult(response.data);
    } catch (error) {
      setDeviceLicenseError(getErrorMessage(error));
    } finally {
      setDeviceLicenseLoading(false);
    }
  };

  const handleVerifyLicense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    let payload: LicensePayload;
    try {
      payload = JSON.parse(verifyPayload);
    } catch {
      setVerifyError('Payload must be valid JSON.');
      setVerifyLoading(false);
      return;
    }

    try {
      const response = await apiClient.verifyLicense(payload, verifySignature.trim());
      setVerifyResult(response.data);
    } catch (error) {
      setVerifyError(getErrorMessage(error));
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Licenses & Unlock Tokens"
          description="Issue, verify, and inspect signed licenses for devices."
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Issue License</h2>
                <p className="mt-1 text-sm text-gray-500">Create a signed license for an existing active or completed contract.</p>
              </div>

              <form className="space-y-4" onSubmit={handleIssueLicense}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Device ID"
                    value={issueDeviceId}
                    onChange={(event) => setIssueDeviceId(event.target.value)}
                    placeholder="Device UUID"
                    required
                  />
                  <Input
                    label="Contract ID"
                    value={issueContractId}
                    onChange={(event) => setIssueContractId(event.target.value)}
                    placeholder="Contract UUID"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Expires At"
                    type="date"
                    value={issueExpiresAt}
                    onChange={(event) => setIssueExpiresAt(event.target.value)}
                    required
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Metadata JSON</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      value={issueMetadata}
                      onChange={(event) => setIssueMetadata(event.target.value)}
                      placeholder='{"licenseType":"standard"}'
                    />
                  </div>
                </div>

                {issueError && <p className="text-sm text-red-600">{issueError}</p>}

                <Button type="submit" variant="primary" loading={issueLoading}>
                  Issue License
                </Button>
              </form>

              {issuedLicense && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Latest Issued License</p>
                  <LicenseSummary license={issuedLicense} />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Verify License</h2>
                <p className="mt-1 text-sm text-gray-500">Validate a payload and base64 signature against the public license key.</p>
              </div>

              <form className="space-y-4" onSubmit={handleVerifyLicense}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Payload JSON</label>
                  <textarea
                    rows={7}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    value={verifyPayload}
                    onChange={(event) => setVerifyPayload(event.target.value)}
                    placeholder='{"deviceId":"...","contractId":"...","issuedAt":"...","expiresAt":"...","keyId":"default","algorithm":"RSA-SHA256"}'
                    required
                  />
                </div>
                <Input
                  label="Signature"
                  value={verifySignature}
                  onChange={(event) => setVerifySignature(event.target.value)}
                  placeholder="Base64 signature"
                  required
                />

                {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}

                <Button type="submit" variant="secondary" loading={verifyLoading}>
                  Verify License
                </Button>
              </form>

              {verifyResult && <VerificationSummary result={verifyResult} />}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Lookup License by ID</h2>
                <p className="mt-1 text-sm text-gray-500">Find a license record and inspect its signed payload.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                <Input
                  label="License ID"
                  value={lookupLicenseId}
                  onChange={(event) => setLookupLicenseId(event.target.value)}
                  placeholder="License UUID"
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    loading={lookupLicenseLoading}
                    onClick={handleLookupLicense}
                    disabled={!lookupLicenseId.trim()}
                  >
                    Lookup
                  </Button>
                </div>
              </div>

              {lookupLicenseError && <p className="text-sm text-red-600">{lookupLicenseError}</p>}
              {licenseDetail && <LicenseSummary license={licenseDetail} />}
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Active License for Device</h2>
                <p className="mt-1 text-sm text-gray-500">Check the current unlock status for a device.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                <Input
                  label="Device ID"
                  value={deviceIdLookup}
                  onChange={(event) => setDeviceIdLookup(event.target.value)}
                  placeholder="Device UUID"
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    loading={deviceLicenseLoading}
                    onClick={handleLookupDeviceLicense}
                    disabled={!deviceIdLookup.trim()}
                  >
                    Check Device
                  </Button>
                </div>
              </div>

              {deviceLicenseError && <p className="text-sm text-red-600">{deviceLicenseError}</p>}
              {deviceLicenseResult && <DeviceLicenseSummary result={deviceLicenseResult} />}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
