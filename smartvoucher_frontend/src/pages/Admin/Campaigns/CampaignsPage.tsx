import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmModal } from '@/components/layout/admin/confirmModal';
import { campaignApi, type Campaign, type CampaignPayload } from '@/services/apiService';

type CampaignForm = {
  name: string;
  description: string;
  start_at: string;
  end_at: string;
  budget: string;
  status: Campaign['status'];
};

const emptyForm = (): CampaignForm => ({
  name: '',
  description: '',
  start_at: '',
  end_at: '',
  budget: '',
  status: 'draft',
});

const statusLabels: Record<Campaign['status'], string> = {
  draft: 'Bản nháp',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn tất',
};

const statusClasses: Record<Campaign['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const toDateTimeInput = (value: string) => {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response;
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data;
      if (typeof data === 'object' && data !== null) {
        const values = Object.values(data);
        const message = values.flatMap((value) => Array.isArray(value) ? value : [value])
          .find((value): value is string => typeof value === 'string');
        if (message) return message;
      }
    }
  }
  return 'Đã xảy ra lỗi, vui lòng thử lại.';
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await campaignApi.list());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  const openCreateDialog = () => {
    setEditingCampaign(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description,
      start_at: toDateTimeInput(campaign.start_at),
      end_at: toDateTimeInput(campaign.end_at),
      budget: campaign.budget ?? '',
      status: campaign.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.start_at || !form.end_at) {
      toast.error('Vui lòng nhập tên và thời gian của chiến dịch.');
      return;
    }

    const startAt = new Date(form.start_at);
    const endAt = new Date(form.end_at);
    if (endAt <= startAt) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    if (form.budget && Number(form.budget) < 0) {
      toast.error('Ngân sách không được âm.');
      return;
    }

    const payload: CampaignPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      budget: form.budget ? form.budget : null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (editingCampaign) {
        await campaignApi.update(editingCampaign.id, payload);
        toast.success('Đã cập nhật chiến dịch.');
      } else {
        await campaignApi.create(payload);
        toast.success('Đã tạo chiến dịch.');
      }
      setDialogOpen(false);
      await fetchCampaigns();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await campaignApi.delete(deleteTarget.id);
      toast.success('Đã xóa chiến dịch.');
      setDeleteTarget(null);
      await fetchCampaigns();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const updateForm = <K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Megaphone className="size-4" />
            Quản lý marketing
          </div>
          <h1 className="text-3xl font-black tracking-tight">Chiến dịch</h1>
          <p className="mt-1 text-muted-foreground">Tạo và quản lý chiến dịch, ngân sách và voucher liên kết.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Tạo chiến dịch
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Đang tải chiến dịch...</CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Megaphone className="size-10 text-muted-foreground" />
            <div>
              <p className="font-semibold">Chưa có chiến dịch nào</p>
              <p className="text-sm text-muted-foreground">Tạo chiến dịch đầu tiên để nhóm các voucher theo chương trình.</p>
            </div>
            <Button onClick={openCreateDialog} variant="outline"><Plus className="mr-2 size-4" />Tạo chiến dịch</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{campaign.name}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {campaign.description || 'Chưa có mô tả'}
                  </CardDescription>
                </div>
                <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[campaign.status]}`}>
                  {statusLabels[campaign.status]}
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CalendarDays className="mt-0.5 size-4 shrink-0" />
                    <span>{formatDate(campaign.start_at)} – {formatDate(campaign.end_at)}</span>
                  </div>
                  <div><span className="font-semibold text-foreground">Voucher:</span> {campaign.voucher_count}</div>
                  <div>
                    <span className="font-semibold text-foreground">Ngân sách:</span>{' '}
                    {campaign.budget === null
                      ? 'Không giới hạn'
                      : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(campaign.budget))}
                  </div>
                  <div><span className="font-semibold text-foreground">Người tạo:</span> {campaign.created_by}</div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(campaign)}>
                    <Pencil className="mr-2 size-4" />Sửa
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(campaign)}>
                    <Trash2 className="mr-2 size-4" />Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Chỉnh sửa chiến dịch' : 'Tạo chiến dịch'}</DialogTitle>
            <DialogDescription>Thông tin ngày giờ được lưu theo múi giờ địa phương của bạn.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Tên chiến dịch</Label>
              <Input id="campaign-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} maxLength={255} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">Mô tả</Label>
              <textarea
                id="campaign-description"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-start">Bắt đầu</Label>
                <Input id="campaign-start" type="datetime-local" value={form.start_at} onChange={(event) => updateForm('start_at', event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-end">Kết thúc</Label>
                <Input id="campaign-end" type="datetime-local" value={form.end_at} onChange={(event) => updateForm('end_at', event.target.value)} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-budget">Ngân sách (VND, tùy chọn)</Label>
                <Input id="campaign-budget" type="number" min="0" step="0.01" value={form.budget} onChange={(event) => updateForm('budget', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-status">Trạng thái</Label>
                <select
                  id="campaign-status"
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value as Campaign['status'])}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu chiến dịch'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Xóa chiến dịch?"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name ?? ''}"? Chiến dịch có voucher liên kết sẽ không thể xóa.`}
        confirmText="Xóa chiến dịch"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
