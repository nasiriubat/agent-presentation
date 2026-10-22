// Demo 2 · Watch it do your work: this week's supplier invoices, matched to purchase orders,
// the odd one queried, a human approving the email before it goes out.
import { toolmapDemo, loadJson } from './toolmapDemo.js';

export const INVOICE_TOOLS = [
  { id: 'read_inbox', label: 'Inbox', icon: 'mail', phrase: 'reads the invoices in the inbox' },
  { id: 'calculator', label: 'Calculator', icon: 'calculator' },
  { id: 'search_orders', label: 'Purchase orders', icon: 'database', phrase: 'checks the purchase orders' },
  { id: 'draft_email', label: 'Draft email', icon: 'file', phrase: 'drafts an email' },
  { id: 'send_email', label: 'Send email', icon: 'send', danger: true, phrase: 'sends the email' },
];

export const ORDERS_TABLE = {
  title: 'Purchase orders', icon: 'database',
  columns: [{ key: 'po', label: 'PO' }, { key: 'supplier', label: 'Supplier' }, { key: 'amount_eur', label: 'Amount', money: true }, { key: 'status', label: 'Status' }],
};

export async function mount(container, { api } = {}) {
  const rows = await loadJson('data/orders.json');
  return toolmapDemo(container, {
    api,
    tools: INVOICE_TOOLS,
    panels: { db: { ...ORDERS_TABLE, rows }, memory: [] },
    tabs: [{ id: 'invoices', label: 'This week\'s invoices', replay: 'replays/demo2-invoices.json' }],
  });
}
