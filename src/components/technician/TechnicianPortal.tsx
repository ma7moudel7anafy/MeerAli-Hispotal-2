import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LabTechnicianPortal } from './LabTechnicianPortal';
import { RadiologyTechnicianPortal } from './RadiologyTechnicianPortal';

interface TechnicianPortalProps {
  onBackToPublic?: () => void;
}

export const TechnicianPortal: React.FC<TechnicianPortalProps> = ({ onBackToPublic }) => {
  const { isRadiologyTech } = useAuth();

  if (isRadiologyTech) {
    return <RadiologyTechnicianPortal onBackToPublic={onBackToPublic} />;
  }

  return <LabTechnicianPortal onBackToPublic={onBackToPublic} />;
};
