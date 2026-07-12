import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, updatePassword, getRoles } from '../../services/api';
import { toast } from 'react-toastify';
import './Settings.css';

const Settings = () => {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', role: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, rolesRes] = await Promise.all([getProfile(), getRoles()]);
      setProfile(profileRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      toast.error("Error fetching settings data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("Passwords do not match!");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(passwordForm);
      toast.success('Password updated successfully!');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error("Error updating password");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (roleIndex, permKey) => {
    const updatedRoles = [...roles];
    updatedRoles[roleIndex].permissions[permKey] = !updatedRoles[roleIndex].permissions[permKey];
    setRoles(updatedRoles);
  };

  if (loading) {
    return <div className="loading-state">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <div className="page-header">
        <h1>Settings & RBAC</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-column">
          <div className="settings-card">
            <h2>User Profile</h2>
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label>Name</label>
                <input required type="text" name="name" className="form-control" value={profile.name} onChange={handleProfileChange} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input required type="email" name="email" className="form-control" value={profile.email} onChange={handleProfileChange} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input required type="text" name="phone" className="form-control" value={profile.phone} onChange={handleProfileChange} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" className="form-control" value={profile.role} disabled style={{opacity: 0.5}} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          <div className="settings-card mt-2">
            <h2>Change Password</h2>
            <form onSubmit={savePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input required type="password" name="current" className="form-control" value={passwordForm.current} onChange={handlePasswordChange} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input required type="password" name="new" className="form-control" value={passwordForm.new} onChange={handlePasswordChange} />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input required type="password" name="confirm" className="form-control" value={passwordForm.confirm} onChange={handlePasswordChange} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        <div className="settings-column">
          <div className="settings-card role-matrix-card">
            <h2>Role Permissions</h2>
            <p className="text-muted">Role-Based Access Control Matrix</p>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r, i) => (
                    <tr key={i}>
                      <td style={{fontWeight: 600, color: 'var(--primary)'}}>{r.role}</td>
                      <td>
                        <div className="permissions-grid">
                          {Object.keys(r.permissions).map((permKey, j) => (
                            <label key={j} className="checkbox-label">
                              <input 
                                type="checkbox" 
                                checked={r.permissions[permKey]} 
                                onChange={() => togglePermission(i, permKey)}
                              />
                              {permKey}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
