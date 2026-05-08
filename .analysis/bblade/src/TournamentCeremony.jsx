// TournamentOpening.jsx
// Adapter: bridges App.jsx (onContinue) → TournamentOpeningCeremony (onClose)

import React from 'react';
import TournamentOpeningCeremony from './TournamentOpeningCeremony.jsx';

const TournamentOpening = ({ universeManager, tournament, onContinue }) => {
  return (
    <TournamentOpeningCeremony
      universeManager={universeManager}
      tournament={tournament}
      onClose={onContinue}
    />
  );
};

export default TournamentOpening;
