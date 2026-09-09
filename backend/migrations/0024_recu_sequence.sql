-- Compteur de reçus persistant (remplace le compteur mémoire qui repartait
-- à zéro à chaque redémarrage et pouvait générer des doublons).
CREATE SEQUENCE IF NOT EXISTS recu_seq;
