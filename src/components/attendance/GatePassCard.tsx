import { PrinterIcon, ScanLineIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { QrCode } from './QrCode';

/** The code a student scans at the gate (QR + printed text for barcode readers / typing). */
export function GatePassCard({ name, code, className }: {name: string;code?: string;className?: string;}) {
  if (!code) return null;
  return (
    <Card className={className}>
      <CardHeader
        title={<span className="flex items-center gap-2"><ScanLineIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />Gate pass</span>}
        description="Show this code at the gate when you arrive."
        action={<Button size="sm" variant="ghost" className="print:hidden" icon={<PrinterIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => window.print()}>Print</Button>} />
      <CardBody className="flex flex-col items-center gap-2 text-center">
        <QrCode value={code} size={168} label={`QR code for ${name}: ${code}`} />
        <p dir="auto" className="text-[14px] font-bold text-ink-900">{name}</p>
        <p className="font-mono text-[15px] tracking-widest text-ink-700">{code}</p>
      </CardBody>
    </Card>);

}
