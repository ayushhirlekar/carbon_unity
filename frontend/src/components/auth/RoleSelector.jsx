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
      icon: '🌾',
      color: 'border-brand-400 bg-brand-50 ring-brand-200',
    },
    {
      value: ROLES.BUYER,
      label: 'Buyer',
      description: 'Purchase carbon credits to offset your carbon footprint',
      icon: '🏢',
      color: 'border-gold-400 bg-gold-50 ring-gold-200',
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
            <span className="text-3xl mb-3 block">{role.icon}</span>
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
