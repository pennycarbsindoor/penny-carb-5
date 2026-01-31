import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { FoodItemWithImages, ServiceType, FoodCategory, Panchayat } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  Leaf
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AdminNavbar from '@/components/admin/AdminNavbar';
import ImageUpload from '@/components/admin/ImageUpload';

const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: 'indoor_events', label: 'Indoor Events' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen' },
  { value: 'homemade', label: 'Homemade Food' },
];

const AdminItems: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const [items, setItems] = useState<FoodItemWithImages[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterServiceType, setFilterServiceType] = useState<string>('all');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItemWithImages | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    service_type: 'cloud_kitchen' as ServiceType,
    service_types: [] as string[],
    category_id: '',
    is_vegetarian: false,
    is_available: true,
    preparation_time_minutes: '',
    available_all_panchayats: true,
    available_panchayat_ids: [] as string[],
  });

  const isAdmin = role === 'super_admin' || role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, panchayatsRes] = await Promise.all([
        supabase
          .from('food_items')
          .select(`
            *,
            images:food_item_images(*),
            category:food_categories(*)
          `)
          .order('name'),
        supabase
          .from('food_categories')
          .select('*')
          .order('name'),
        supabase
          .from('panchayats')
          .select('*')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (itemsRes.data) setItems(itemsRes.data as FoodItemWithImages[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as FoodCategory[]);
      if (panchayatsRes.data) setPanchayats(panchayatsRes.data as Panchayat[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async (item: FoodItemWithImages) => {
    try {
      const { error } = await supabase
        .from('food_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_available: !i.is_available } : i
      ));

      toast({
        title: item.is_available ? 'Item disabled' : 'Item enabled',
        description: `${item.name} is now ${item.is_available ? 'unavailable' : 'available'}`,
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = (item?: FoodItemWithImages) => {
    if (item) {
      setEditingItem(item);
      const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0];
      setUploadedImageUrl(primaryImage?.image_url || null);
      // Get service_types from item or fallback to service_type
      const itemWithExtras = item as FoodItemWithImages & { 
        service_types?: string[]; 
        available_all_panchayats?: boolean;
        available_panchayat_ids?: string[];
      };
      const serviceTypesArray = itemWithExtras.service_types?.length 
        ? itemWithExtras.service_types 
        : [item.service_type];
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        service_type: item.service_type,
        service_types: serviceTypesArray,
        category_id: item.category_id || '',
        is_vegetarian: item.is_vegetarian,
        is_available: item.is_available,
        preparation_time_minutes: item.preparation_time_minutes?.toString() || '',
        available_all_panchayats: itemWithExtras.available_all_panchayats ?? true,
        available_panchayat_ids: itemWithExtras.available_panchayat_ids || [],
      });
    } else {
      setEditingItem(null);
      setUploadedImageUrl(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        service_type: 'cloud_kitchen',
        service_types: [],
        category_id: '',
        is_vegetarian: false,
        is_available: true,
        preparation_time_minutes: '',
        available_all_panchayats: true,
        available_panchayat_ids: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.price) {
      toast({
        title: 'Validation Error',
        description: 'Name and price are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.service_types.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one service type',
        variant: 'destructive',
      });
      return;
    }

    try {
      const itemData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        service_type: formData.service_types[0] as ServiceType, // Primary service type
        service_types: formData.service_types,
        category_id: formData.category_id || null,
        is_vegetarian: formData.is_vegetarian,
        is_available: formData.is_available,
        preparation_time_minutes: formData.preparation_time_minutes 
          ? parseInt(formData.preparation_time_minutes) 
          : null,
        available_all_panchayats: formData.available_all_panchayats,
        available_panchayat_ids: formData.available_all_panchayats ? [] : formData.available_panchayat_ids,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('food_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        // Handle image update
        if (uploadedImageUrl) {
          // Delete existing images for this item
          await supabase
            .from('food_item_images')
            .delete()
            .eq('food_item_id', editingItem.id);

          // Add new image
          await supabase
            .from('food_item_images')
            .insert({
              food_item_id: editingItem.id,
              image_url: uploadedImageUrl,
              is_primary: true,
            });
        }

        toast({ title: 'Item updated successfully' });
      } else {
        const { data: newItem, error } = await supabase
          .from('food_items')
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;

        // Add image for new item
        if (uploadedImageUrl && newItem) {
          await supabase
            .from('food_item_images')
            .insert({
              food_item_id: newItem.id,
              image_url: uploadedImageUrl,
              is_primary: true,
            });
        }

        toast({ title: 'Item created successfully' });
      }

      setIsDialogOpen(false);
      setUploadedImageUrl(null);
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (item: FoodItemWithImages) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterServiceType === 'all' || item.service_type === filterServiceType;
    return matchesSearch && matchesType;
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access Denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      {/* Page Header */}
      <div className="border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Food Items</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/categories')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterServiceType} onValueChange={setFilterServiceType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              {serviceTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <main className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-6xl">🍽️</span>
            <h2 className="mt-4 text-lg font-semibold">No items found</h2>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0];
              
              return (
                <Card key={item.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {primaryImage ? (
                        <img
                          src={primaryImage.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">🍽️</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        {item.is_vegetarian && (
                          <Leaf className="h-4 w-4 text-success flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {((item as any).service_types?.length ? (item as any).service_types : [item.service_type]).map((st: string) => (
                          <Badge key={st} variant="outline" className="text-xs">
                            {st.replace('_', ' ')}
                          </Badge>
                        ))}
                        <Badge variant={item.is_available ? 'default' : 'secondary'}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => handleToggleAvailability(item)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Item Image</Label>
              <ImageUpload
                bucket="food-items"
                folder="items"
                currentImageUrl={uploadedImageUrl}
                onUploadComplete={(url) => setUploadedImageUrl(url)}
                onRemove={() => setUploadedImageUrl(null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prep_time">Prep Time (mins)</Label>
                <Input
                  id="prep_time"
                  type="number"
                  value={formData.preparation_time_minutes}
                  onChange={(e) => setFormData({ ...formData, preparation_time_minutes: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Service Types *</Label>
              <p className="text-xs text-muted-foreground">Select all modules where this item is available</p>
              <div className="space-y-2">
                {serviceTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${type.value}`}
                      checked={formData.service_types.includes(type.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ 
                            ...formData, 
                            service_types: [...formData.service_types, type.value] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            service_types: formData.service_types.filter(t => t !== type.value) 
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`service-${type.value}`} className="font-normal cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {categories
                    .filter(c => 
                      formData.service_types.some(st => c.service_types?.includes(st)) || 
                      (c.service_types?.length === 0)
                    )
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Panchayat Availability */}
            <div className="space-y-3">
              <Label>Panchayat Availability</Label>
              <RadioGroup
                value={formData.available_all_panchayats ? 'all' : 'selected'}
                onValueChange={(v) => setFormData({ 
                  ...formData, 
                  available_all_panchayats: v === 'all',
                  available_panchayat_ids: v === 'all' ? [] : formData.available_panchayat_ids
                })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="panchayat-all" />
                  <Label htmlFor="panchayat-all" className="font-normal cursor-pointer">
                    Available in all Panchayats
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="panchayat-selected" />
                  <Label htmlFor="panchayat-selected" className="font-normal cursor-pointer">
                    Available in selected Panchayats only
                  </Label>
                </div>
              </RadioGroup>

              {!formData.available_all_panchayats && (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {panchayats.map((p) => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`panchayat-${p.id}`}
                        checked={formData.available_panchayat_ids.includes(p.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ 
                              ...formData, 
                              available_panchayat_ids: [...formData.available_panchayat_ids, p.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              available_panchayat_ids: formData.available_panchayat_ids.filter(id => id !== p.id) 
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`panchayat-${p.id}`} className="font-normal text-sm cursor-pointer">
                        {p.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="vegetarian">Vegetarian</Label>
              <Switch
                id="vegetarian"
                checked={formData.is_vegetarian}
                onCheckedChange={(v) => setFormData({ ...formData, is_vegetarian: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="available">Available</Label>
              <Switch
                id="available"
                checked={formData.is_available}
                onCheckedChange={(v) => setFormData({ ...formData, is_available: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminItems;
