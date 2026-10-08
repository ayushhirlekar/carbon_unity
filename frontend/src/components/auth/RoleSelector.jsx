import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { ROLES } from '../../config/constants';

export default function RoleSelector({ onSelect }) {
  const [selectedRole, setSelectedRole] = useState('');
  const [displayName, setDisplayName] = useState('');

  const roles = [
    {
      value: ROLES.FARMER,
      label: 'Farmer',
      description: 'Generate carbon credits from your farms and sell on the marketplace',
      icon: (
        <svg className="w-6 h-6 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5m-15 10.5V10.5" />
        </svg>
      ),
      color: 'border-brand-500 bg-brand-50/60 ring-brand-200',
    },
    {
      value: ROLES.BUYER,
      label: 'Buyer',
      description: 'Purchase carbon credits to offset your carbon footprint',
      icon: (
        <svg className="w-6 h-6 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21" />
        </svg>
      ),
      color: 'border-brand-500 bg-brand-50/60 ring-brand-200',
    },
  ];

  const handleContinue = () => {
    if (!selectedRole) return;
    onSelect({ role: selectedRole, displayName: displayName.trim() || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-surface-900 mb-1">Choose Your Role</h3>
        <p className="text-sm text-surface-500">Select how you want to use CarbonUnity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => setSelectedRole(role.value)}
            className={`
              p-5 rounded-2xl border-2 text-left transition-all duration-200
              hover:shadow-card-hover hover:-translate-y-0.5
              ${selectedRole === role.value ? `${role.color} ring-2` : 'border-surface-200 bg-white hover:border-surface-300'}
            `}
            id={`role-${role.value}`}
          >
            <div className="w-11 h-11 rounded-xl bg-white border border-surface-200/80 flex items-center justify-center mb-3 shadow-subtle">
              {role.icon}
            </div>
            <h4 className="font-bold text-surface-900 mb-1">{role.label}</h4>
            <p className="text-xs text-surface-500 leading-relaxed">{role.description}</p>
          </button>
        ))}
      </div>

      {selectedRole && (
        <div className="animate-slide-up space-y-4">
          <Input
            id="display-name"
            label="Display Name"
            placeholder={selectedRole === ROLES.FARMER ? "e.g., Green Valley Farm" : "e.g., EcoTech Corp"}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            hint="Optional — you can set this later"
          />
          <Button onClick={handleContinue} size="lg" className="w-full" id="btn-continue-register">
            Continue as {selectedRole === ROLES.FARMER ? 'Farmer' : 'Buyer'}
          </Button>
        </div>
      )}
    </div>
  );
}
