import { useRef, useState } from 'react';
import { SectionCard } from '../common/SectionCard.jsx';
import { Icon } from '../common/Icon.jsx';

/**
 * Final prescription image for the visit. The file is held locally with a
 * preview until the clinician confirms — `onUpload` is where the Supabase
 * Storage call to the `prescriptions` bucket is wired in.
 */
export function PrescriptionUpload({ onUpload }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  function accept(nextFile) {
    if (!nextFile) return;
    setFile(nextFile);
    onUpload?.(nextFile);
  }

  return (
    <SectionCard icon="upload" title="Prescription" subtitle="Shared with the patient after the visit" bodyClassName="p-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors
                    ${dragging ? 'border-cypress bg-subcanvas' : 'border-line-strong bg-subcanvas/60'}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink-2">
          <Icon name="upload" size={18} />
        </span>

        {file ? (
          <p className="text-body-sm text-ink">
            <span className="font-medium">{file.name}</span>
            <span className="block text-ink-3">{(file.size / 1024).toFixed(0)} KB attached</span>
          </p>
        ) : (
          <p className="text-body-sm text-ink-3">Drop the prescription image here, or</p>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-line bg-surface px-3 py-1.5 text-label-md text-cypress hover:bg-subcanvas"
        >
          {file ? 'Replace file' : 'Browse files'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </div>
    </SectionCard>
  );
}

export default PrescriptionUpload;
