const TELEGRAM_API = 'https://api.telegram.org';

export async function sendTransactionNotification(transaction, summary) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { status: 'skipped', reason: 'Telegram belum dikonfigurasi.' };
  }

  const income = transaction.type === 'INCOME';
  const amount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(transaction.amount);

  const balance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(summary.currentBalance);

  const text = [
    `IKHLAS · ${income ? 'Kas Masuk' : 'Kas Keluar'}`,
    `${income ? '+' : '-'}${amount}`,
    `Kategori: ${transaction.category}`,
    `Metode: ${transaction.method === 'TRANSFER' ? 'Transfer' : 'Cash/Tunai'}`,
    `Tanggal: ${transaction.transactionDate}`,
    transaction.description ? `Keterangan: ${transaction.description}` : null,
    `Saldo saat ini: ${balance}`
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API ${response.status}: ${body.slice(0, 180)}`);
    }

    return { status: 'sent' };
  } catch (error) {
    console.error('Telegram notification failed:', error);
    return { status: 'failed', reason: error.message };
  }
}
