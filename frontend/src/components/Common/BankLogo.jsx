import { BANK_COLORS } from '../../constants';

export default function BankLogo({ bank }) {
  const bg = BANK_COLORS[bank] || '#607d8b';
  const abbr = bank.substring(0, 2).toUpperCase();
  return (
    <div className="bank-name">
      <span className="bank-logo" style={{ background: bg }}>{abbr}</span>
      <span>{bank}</span>
    </div>
  );
}
