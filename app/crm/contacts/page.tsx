'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Filter,
  Phone,
  Mail,
  Building,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Contact CRUD logic
const initialFormState = {
  id: null,
  name: '',
  email: '',
  phone: '',
  type: 'customer',
  status: 'active',
  lastContact: '',
  value: '',
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'customer': return 'bg-green-100 text-green-800';
    case 'lead': return 'bg-blue-100 text-blue-800';
    case 'vendor': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  return status === 'active' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

export default function ContactsPage() {
  type Contact = {
    id: number;
    name: string;
    email: string;
    phone: string;
    type: string;
    status: string;
    lastContact: string;
    value: number;
  };
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 1,
      name: 'Rahul Sharma',
      email: 'rahul@abc.com',
      phone: '9876543210',
      type: 'Customer',
      status: 'Active',
      lastContact: '2025-08-10',
      value: 120000,
    },
    {
      id: 2,
      name: 'Priya Patel',
      email: 'priya@xyz.com',
      phone: '9123456780',
      type: 'Lead',
      status: 'Inactive',
      lastContact: '2025-07-28',
      value: 80000,
    },
    {
      id: 3,
      name: 'Tech Solutions Ltd',
      email: 'info@techsolutions.com',
      phone: '9001234567',
      type: 'Customer',
      status: 'Active',
      lastContact: '2025-08-15',
      value: 200000,
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialFormState);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setLoading(true);
    const { data, error } = await supabase.from('contacts').select('*');
    if (!error) setContacts(data || []);
    setLoading(false);
  }

  async function handleSaveContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editMode) {
      // Update contact
      await supabase.from('contacts').update(form).eq('id', form.id);
    } else {
      // Create contact
      await supabase.from('contacts').insert([{ ...form, lastContact: new Date().toISOString().slice(0, 10) }]);
    }
    setShowForm(false);
    setForm(initialFormState);
    setEditMode(false);
    fetchContacts();
  }

  function handleEditContact(contact: Contact) {
    setForm({
      id: contact.id as any,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      type: contact.type,
      status: contact.status,
      lastContact: contact.lastContact,
      value: contact.value.toString(),
    });
    setEditMode(true);
    setShowForm(true);
  }

  async function handleDeleteContact(id: number) {
    await supabase.from('contacts').delete().eq('id', id);
    fetchContacts();
  }

  function handleAddContact() {
    setForm(initialFormState);
    setEditMode(false);
    setShowForm(true);
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || contact.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            Manage your customers, leads, and vendors
          </p>
        </div>
        <Button onClick={handleAddContact}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">156</div>
            <p className="text-sm text-muted-foreground">Total Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">89</div>
            <p className="text-sm text-muted-foreground">Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">43</div>
            <p className="text-sm text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-600">24</div>
            <p className="text-sm text-muted-foreground">Vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" onSubmit={handleSaveContact}>
            <h2 className="text-lg font-bold mb-4">{editMode ? 'Edit Contact' : 'Add Contact'}</h2>
            <div className="mb-3">
              <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="mb-3">
              <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="mb-3">
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="mb-3">
              <select className="w-full border rounded p-2" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="customer">Customer</option>
                <option value="lead">Lead</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div className="mb-3">
              <select className="w-full border rounded p-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="mb-3">
              <Input placeholder="Value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="flex space-x-2">
              <Button type="submit">{editMode ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contact List</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Last Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Value</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{contact.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="mr-2 h-3 w-3" />
                          {contact.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="mr-2 h-3 w-3" />
                          {contact.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={getTypeColor(contact.type)}>
                        {contact.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={getStatusColor(contact.status)}>
                        {contact.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {contact.lastContact}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {contact.value}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteContact(contact.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}