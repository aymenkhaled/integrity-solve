import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { documentApi, programApi } from '@/lib/api';
import {
  FileText, Download, Trash2, Plus, Loader2,
  BookOpen, FileCheck, Shield, FileCog, AlertTriangle,
} from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/utils';
import { toast } from 'sonner';

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileSizeBytes: number | null;
  mimeType: string;
  generatedAt: string;
}

interface Program { id: string; title: string; status: string; }

const DOC_TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  AML_PROGRAM: {
    label: 'AML/CTF Program',
    icon: Shield,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'Complete AML/CTF program document aligned to AUSTRAC requirements.',
  },
  CDD_POLICY: {
    label: 'CDD Policy',
    icon: FileCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'Customer Due Diligence procedures and policy.',
  },
  RISK_ASSESSMENT: {
    label: 'Risk Assessment',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    description: 'ML/TF risk assessment for your designated services.',
  },
  TRAINING_POLICY: {
    label: 'Training Policy',
    icon: BookOpen,
    color: 'text-purple-600',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'AML/CTF staff training program and policy.',
  },
  AUDIT_REPORT: {
    label: 'Audit Report',
    icon: FileCog,
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    description: 'Independent review audit report template.',
  },
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [docType, setDocType] = useState('AML_PROGRAM');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: rawDocs, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn:  () => documentApi.list() as Promise<Document[] | { documents: Document[] }>,
  });

  const docs: Document[] = Array.isArray(rawDocs)
    ? rawDocs
    : ((rawDocs as { documents: Document[] })?.documents ?? []);

  const { data: rawPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn:  () => programApi.list() as Promise<Program[] | { programs: Program[] }>,
  });

  const programs: Program[] = Array.isArray(rawPrograms)
    ? rawPrograms
    : ((rawPrograms as { programs: Program[] })?.programs ?? []);

  const generate = useMutation({
    mutationFn: () => documentApi.generate({
      ...(selectedProgram ? { programId: selectedProgram } : {}),
      documentType: docType,
    }),
    onSuccess: () => {
      toast.success('Document generated');
      qc.invalidateQueries({ queryKey: ['documents'] });
      setGenerateOpen(false);
      setSelectedProgram('');
    },
    onError: () => toast.error('Failed to generate document'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['documents'] });
      setDeleteConfirmId(null);
    },
    onError: () => toast.error('Failed to delete document'),
  });

  function handleDownload(doc: Document) {
    const a = document.createElement('a');
    a.href = `/api/documents/${doc.id}/download`;
    a.download = doc.fileName;
    a.click();
    toast.success('Download started');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Generate and manage AML/CTF compliance documents."
        action={
          <Button
            onClick={() => setGenerateOpen(true)}
            className="gradient-emerald text-white border-0 hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Document
          </Button>
        }
      />

      {/* Document types available */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = docs.filter((d) => d.documentType === key).length;
          return (
            <div
              key={key}
              className="card-3d rounded-2xl border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => { setDocType(key); setGenerateOpen(true); }}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{cfg.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cfg.description}</div>
                  {count > 0 && (
                    <div className="text-xs text-primary mt-1 font-medium">{count} generated</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Documents list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Generated documents ({docs.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : docs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold mb-1">No documents yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first compliance document using the button above.
              </p>
              <Button
                onClick={() => setGenerateOpen(true)}
                className="gradient-emerald text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => {
              const cfg = DOC_TYPE_CONFIG[doc.documentType] ?? DOC_TYPE_CONFIG['AML_PROGRAM']!;
              const Icon = cfg.icon;
              return (
                <div
                  key={doc.id}
                  className="card-3d flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary/20 transition-colors group"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{doc.fileName}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{cfg.label}</span>
                      <span>{formatSize(doc.fileSizeBytes)}</span>
                      <span>{formatRelative(doc.generatedAt)}</span>
                      <span>{formatDate(doc.generatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                      onClick={() => setDeleteConfirmId(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate Compliance Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {DOC_TYPE_CONFIG[docType] && (
                <p className="text-xs text-muted-foreground">{DOC_TYPE_CONFIG[docType]!.description}</p>
              )}
            </div>
            {programs.length > 0 && (
              <div className="space-y-1.5">
                <Label>Based on program <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-select latest program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-select latest program</SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title} — {p.status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <strong>Note:</strong> Generated documents are stored securely and can be downloaded at any time.
              Always review documents with your compliance professional before use.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button
              className="gradient-emerald text-white border-0 hover:opacity-90"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</>
                : 'Generate document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete document?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the document file. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && remove.mutate(deleteConfirmId)}
              disabled={remove.isPending}
            >
              {remove.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</>
                : 'Delete document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
