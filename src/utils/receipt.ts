export const generateReceiptPDF = async (user: any, amount: string, description: string) => {
  const receiptNo = `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Create a hidden element for the receipt content
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="padding: 60px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background: white; width: 750px; margin: auto;">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 80px;">
        <div style="background-color: #2563eb; padding: 10px; rounded: 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
          </svg>
        </div>
        <span style="font-size: 24px; font-weight: 800; tracking-tight: -0.02em; color: #0f172a; font-family: 'Inter', sans-serif;">WytPass</span>
      </div>

      <!-- Title -->
      <h1 style="text-align: center; font-size: 32px; font-weight: 800; margin-bottom: 50px; color: #111; letter-spacing: -0.02em;">Payment Receipt Format</h1>

      <!-- Receipt Metadata -->
      <div style="margin-bottom: 40px; font-size: 15px; color: #111;">
        <p style="margin: 0; font-weight: 600;">Receipt No: <span style="font-weight: 800;">${receiptNo}</span></p>
        <p style="margin: 8px 0 0 0; font-weight: 600;">Date: <span style="font-weight: 800;">[${dateStr.toUpperCase()}]</span></p>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin-bottom: 40px;" />

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 60px; font-size: 14px; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="border: 1px solid #e5e7eb; padding: 14px; text-align: center; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 45%;">Details</th>
            <th style="border: 1px solid #e5e7eb; padding: 14px; text-align: center; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 55%;">Information</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #374151; font-weight: 500;">Received From</td>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #000; font-weight: 800; text-transform: uppercase;">[${(user?.full_name || user?.email || 'Customer').toUpperCase()}]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #374151; font-weight: 500;">Amount Paid</td>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #000; font-weight: 800; text-transform: uppercase;">[${amount}]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #374151; font-weight: 500;">Payment Method</td>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #000; font-weight: 800; text-transform: uppercase;">[UPI / RAZORPAY]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #374151; font-weight: 500;">Description of Goods/Services</td>
            <td style="border: 1px solid #e5e7eb; padding: 14px; color: #000; font-weight: 800; text-transform: uppercase;">[${description.toUpperCase()}]</td>
          </tr>
        </tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111;">Issued by: <span style="font-weight: 800;">[WYTNET SSO]</span></p>
        <p style="margin: 16px 0 0 0; font-size: 15px; font-style: italic; color: #6b7280; font-weight: 500;">Thank you for your payment!</p>
      </div>
    </div>
  `;

  // Off-screen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.appendChild(element);
  document.body.appendChild(container);

  // Load html2pdf from CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  document.body.appendChild(script);

  return new Promise((resolve, reject) => {
    script.onload = () => {
      const opt = {
        margin: 0,
        filename: `receipt_${receiptNo}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 3, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // @ts-ignore
      window.html2pdf().from(element).set(opt).save().then(() => {
        document.body.removeChild(container);
        document.body.removeChild(script);
        resolve(true);
      }).catch((err: any) => {
        console.error('PDF generation error:', err);
        document.body.removeChild(container);
        document.body.removeChild(script);
        reject(err);
      });
    };

    script.onerror = () => {
      console.error('Failed to load html2pdf script');
      document.body.removeChild(container);
      document.body.removeChild(script);
      reject(new Error('Script load failed'));
    };
  });
};
