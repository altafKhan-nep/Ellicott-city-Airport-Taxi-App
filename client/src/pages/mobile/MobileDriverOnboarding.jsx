import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, FileText, ShieldCheck } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VEHICLES } from '../../data/vehicles.js';
import { updateDriverDetails } from '../../services/userService.js';
import { Card, ScreenTitle, SectionBar, PrimaryButton } from '../../components/mobile/MobileUI.jsx';

const DOCS = [
  { kind: 'license', label: 'Driver\'s license' },
  { kind: 'insurance', label: 'Insurance certificate' },
  { kind: 'registration', label: 'Vehicle registration' },
];

// Phones only. The step a driver completes right after registering: vehicle
// details plus the documents an admin will review. Submitting moves the
// account to 'pending' — the driver cannot go online until an admin approves.
export default function MobileDriverOnboarding() {
  const navigate = useNavigate();
  const [vehicleType, setVehicleType] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [docs, setDocs] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickDoc = async (kind) => {
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 75,
        width: 1024,
        height: 768,
        allowEditing: false,
      });
      if (photo.dataUrl) setDocs((d) => ({ ...d, [kind]: photo.dataUrl }));
    } catch {
      /* user cancelled */
    }
  };

  const ready = vehicleType && plateNumber.trim() && licenseNo.trim();

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await updateDriverDetails({
        vehicleType,
        plateNumber,
        licenseNo,
        documents: Object.entries(docs).map(([kind, image]) => ({ kind, image })),
      });
      navigate('/driver', { replace: true });
    } catch (e) {
      setError(e.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-[var(--m-gutter)] pt-5">
      <ScreenTitle>Driver onboarding</ScreenTitle>
      <p className="mb-4 text-sm text-muted">
        Tell us about your vehicle and upload your documents. An admin will review
        them before you can go online.
      </p>

      {/* Vehicle */}
      <section>
        <SectionBar>Vehicle</SectionBar>
        <Card className="space-y-4 p-[var(--m-card-pad)]">
          <label className="block">
            <span className="t-label">Vehicle type</span>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="mt-1.5 w-full rounded-[var(--m-radius-inner)] border border-accent-200 bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink outline-none focus:border-brand-500"
            >
              <option value="" disabled>
                Select your vehicle
              </option>
              {VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — seats {v.seats}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="t-label">License plate</span>
            <input
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder="e.g. ABC-1234"
              className="input-pill mt-1.5 w-full border border-accent-200 bg-surface px-4 py-3.5 text-[15px] uppercase outline-none placeholder:normal-case focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="t-label">Driver's license number</span>
            <input
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              placeholder="e.g. DL-99887"
              className="input-pill mt-1.5 w-full border border-accent-200 bg-surface px-4 py-3.5 text-[15px] outline-none focus:border-brand-500"
            />
          </label>
        </Card>
      </section>

      {/* Documents */}
      <section className="mt-[var(--m-section)]">
        <SectionBar
          action={<span className="text-[11px] font-semibold text-muted">JPG/PNG</span>}
        >
          Documents
        </SectionBar>
        <Card className="divide-y divide-accent-100">
          {DOCS.map((d) => {
            const img = docs[d.kind];
            return (
              <div key={d.kind} className="flex items-center gap-3 px-[var(--m-card-pad)] py-3.5">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    img ? 'bg-success-50 text-success-700' : 'bg-accent-100 text-ink'
                  }`}
                >
                  {img ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{d.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {img ? 'Uploaded' : 'Required'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => pickDoc(d.kind)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-100 px-3.5 py-2 text-xs font-bold text-ink active:bg-accent-200"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {img ? 'Retake' : 'Upload'}
                </button>
              </div>
            );
          })}
        </Card>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-signal-50 px-4 py-3 text-sm text-signal-700">{error}</p>
      )}

      <div className="mt-[var(--m-section)]">
        <PrimaryButton onClick={submit} disabled={!ready || busy}>
          {busy ? 'Submitting…' : 'Submit for review'}
        </PrimaryButton>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" />
          Your documents are reviewed by an admin. You'll get a notification once
          you're approved and can go online.
        </p>
      </div>
    </div>
  );
}
