import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { productApi, type Product, type ProductPayload } from '@/services/apiService';

type ProductForm = ProductPayload;

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  product_type: '',
  unit_price: '',
  is_active: true,
  image: null,
});

const formatCurrency = (value: string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data: unknown = error.response?.data;
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return fallback;

  const details = Object.values(data as Record<string, unknown>)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .find((value): value is string => typeof value === 'string');
  return details ?? fallback;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await productApi.list(true));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách sản phẩm.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setImagePreview('');
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      product_type: product.product_type,
      unit_price: product.unit_price,
      is_active: product.is_active,
      image: null,
    });
    setImagePreview(product.image ?? '');
    setDialogOpen(true);
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, form);
        toast.success('Đã cập nhật sản phẩm.');
      } else {
        await productApi.create(form);
        toast.success('Đã thêm sản phẩm.');
      }
      setDialogOpen(false);
      await fetchProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể lưu sản phẩm. Vui lòng kiểm tra dữ liệu và thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (product: Product) => {
    try {
      if (product.is_active) {
        await productApi.deactivate(product.id);
        toast.success('Đã ngừng kinh doanh sản phẩm.');
      } else {
        await productApi.update(product.id, { is_active: true });
        toast.success('Đã mở bán lại sản phẩm.');
      }
      await fetchProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật trạng thái sản phẩm.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">Danh mục được dùng trong cửa hàng, đơn hàng và điều kiện voucher.</p>
        </div>
        <Button onClick={openCreateDialog}><Plus /> Thêm sản phẩm</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sản phẩm</CardTitle>
          <CardDescription>Sản phẩm ngừng bán vẫn được giữ lại để bảo toàn lịch sử đơn hàng và voucher.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Đang tải...</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chưa có sản phẩm nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Ảnh</th>
                    <th className="px-3 py-3 font-medium">Tên sản phẩm</th>
                    <th className="px-3 py-3 font-medium">Danh mục</th>
                    <th className="px-3 py-3 font-medium">Giá</th>
                    <th className="px-3 py-3 font-medium">Trạng thái</th>
                    <th className="px-3 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="px-3 py-4">
                        {product.image && <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />}
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-medium">{product.name}</div>
                        {product.description && <div className="mt-1 max-w-md truncate text-xs text-muted-foreground">{product.description}</div>}
                      </td>
                      <td className="px-3 py-4">{product.product_type}</td>
                      <td className="px-3 py-4 whitespace-nowrap">{formatCurrency(product.unit_price)}</td>
                      <td className="px-3 py-4">
                        <span className={product.is_active ? 'text-emerald-600' : 'text-slate-500'}>
                          {product.is_active ? 'Đang bán' : 'Ngừng bán'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                            <Pencil /> Sửa
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void toggleProduct(product)}>
                            {product.is_active ? <ToggleLeft /> : <ToggleRight />}
                            {product.is_active ? 'Ngừng bán' : 'Mở bán'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
            <DialogDescription>Thông tin này sẽ được dùng làm nguồn dữ liệu khi thanh toán.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Tên sản phẩm</Label>
              <Input id="product-name" required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-type">Danh mục</Label>
                <Input id="product-type" required maxLength={100} placeholder="Ví dụ: candy, drink" value={form.product_type} onChange={(event) => setForm({ ...form, product_type: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-price">Giá (VND)</Label>
                <Input id="product-price" type="number" min="0" step="0.01" required value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Mô tả</Label>
              <textarea
                id="product-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-image">Ảnh sản phẩm</Label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setForm({ ...form, image: file });
                  setImagePreview(file ? URL.createObjectURL(file) : editingProduct?.image ?? '');
                }}
              />
              {imagePreview && <img src={imagePreview} alt="Xem trước ảnh sản phẩm" className="h-24 w-24 rounded-lg object-cover" />}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
