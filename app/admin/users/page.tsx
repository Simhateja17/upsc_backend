'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

interface UserRecord {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const loadUsers = (searchTerm?: string) => {
    setLoading(true);
    adminService
      .getUsers(searchTerm ? { search: searchTerm } : undefined)
      .then((res) => {
        const data = res.data;
        setUsers(Array.isArray(data) ? data : data?.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSearch = () => {
    loadUsers(search);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setMsg('');
    try {
      await adminService.updateUser(userId, { role });
      setMsg(`User role updated to ${role}`);
      loadUsers(search);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <h1
        className="font-inter font-bold text-[#111827] mb-[clamp(1.5rem,2vw,2rem)]"
        style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}
      >
        User Management
      </h1>

      {msg && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm font-inter"
          style={{
            background: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
            color: msg.startsWith('Error') ? '#991B1B' : '#065F46',
            border: `1px solid ${msg.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`,
          }}
        >
          {msg}
        </div>
      )}

      <div className="bg-white rounded-2xl p-[clamp(1.25rem,1.5vw,1.75rem)]" style={{ border: '1px solid #E5E7EB' }}>
        {/* Search */}
        <div className="flex gap-2 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email or name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm"
            style={{ background: '#6366F1' }}
          >
            Search
          </button>
        </div>

        {/* Users Table */}
        {loading ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-[#6B7280] font-medium font-inter">User</th>
                  <th className="text-left py-3 px-3 text-[#6B7280] font-medium font-inter">Email</th>
                  <th className="text-left py-3 px-3 text-[#6B7280] font-medium font-inter">Role</th>
                  <th className="text-left py-3 px-3 text-[#6B7280] font-medium font-inter">Verified</th>
                  <th className="text-left py-3 px-3 text-[#6B7280] font-medium font-inter">Joined</th>
                  <th className="text-left py-3 px-3 text-[#6B7280] font-medium font-inter">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                          style={{ background: u.role === 'admin' ? '#6366F1' : '#9CA3AF' }}
                        >
                          {(u.firstName?.[0] || u.email[0] || 'U').toUpperCase()}
                        </div>
                        <span className="text-[#111827] font-medium">
                          {u.firstName || ''} {u.lastName || ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#6B7280]">{u.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: u.role === 'admin' ? '#EDE9FE' : '#F3F4F6',
                          color: u.role === 'admin' ? '#6D28D9' : '#6B7280',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {u.emailVerified ? (
                        <span className="text-xs text-green-600">Verified</span>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#6B7280]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-3">
                      {u.role === 'user' ? (
                        <button
                          onClick={() => handleRoleChange(u.id, 'admin')}
                          className="text-xs text-[#6366F1] hover:underline"
                        >
                          Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(u.id, 'user')}
                          className="text-xs text-[#EF4444] hover:underline"
                        >
                          Remove Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
