import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { documentApi, programApi } from '@/lib/api';
import { FileText, Download, Trash2, Plus, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
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

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [docType, setDocType] = useState('AML_PROGRAM');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn:  () => documentApi.list() as Promise<Document[]>,
  });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn:  () => programApi.list() as Promise<Program[]>,
  });

  const generate = useMutation({
    mutationFn: (data: { programId: string; documentType: string }) =>
      documentApi.generate(data),
    onSuccess: () => {
      toast.success('Document generated successfully');
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
    },
    onError: () => toast.error('Failed to delete document'),
  });

  function handleDownload(doc: Document) {
    const url = `/api/documents/${doc.id}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    a.click();
  }

  function formatSize(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  const DOC_TYPE_LABELS: Record<string, string> = {
    AML_PROGRAM:          'AML/CTF Program',
    RISK_ASSESSMENT:      'Risk Assessment',
    CDD_FORM:             'CDD Form',
    EDD_FORM:             'EDD Form',
    SMR_DRAFT:            'SMR Draft',
    SMR_SUBMITTED:        'SMR Submitted',
    EVIDENCE_BUNDLE:      'Evidence Bundle',
    TRAINING_CERTIFICATE: 'Training Certificate',
    BOARD_MINUTES:        'Board Minutes',
    POLICY:               'Policy Document',
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Generate and manage AML/CTF compliance documents."
        action={
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Document
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !docs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No documents yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Generate your AML/CTF program document to get started.
            </p>
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{docs.length} Document{docs.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{doc.fileName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Generated {formatDate(doc.generatedAt)} · {formatSize(doc.fileSizeBytes)}
                    </div>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </Badge>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove.mutate(doc.id)}
                      disabled={remove.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">AML Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program…" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => generate.mutate({ programId: selectedProgram, documentType: docType })}
              disabled={!selectedProgram || generate.isPending}
            >
              {generate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
