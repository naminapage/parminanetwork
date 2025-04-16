async function loadKomisiUser() {
  const user = window.currentUser;
  if (!user || !user.username) {
    console.error("User belum login.");
    return;
  }

  const komisiEl = document.getElementById("komisiList");
  const totalEl = document.getElementById("totalKomisi");
  if (!komisiEl || !totalEl) return;

  komisiEl.innerHTML = "";
  let total = 0;

  try {
    const snapshot = await db.collection("komisi")
      .where("userID", "==", user.username)
      .orderBy("tanggal", "desc")
      .limit(50)
      .get();

    if (snapshot.empty) {
      komisiEl.innerHTML = "<p class='text-gray-500'>Belum ada komisi.</p>";
      totalEl.textContent = "Rp 0";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const nominal = data.nominal || 0;
      total += nominal;

      const item = document.createElement("div");
      item.className = "border-b py-2";
      item.innerHTML = `
        <div class="font-semibold">${data.jenis || 'Komisi'}</div>
        <div class="text-sm text-gray-600">Dari: ${data.sumber || '–'}</div>
        <div class="text-sm text-gray-500">${formatTanggal(data.tanggal?.toDate())}</div>
        <div class="text-green-600 font-bold">Rp ${nominal.toLocaleString()}</div>
      `;
      komisiEl.appendChild(item);
    });

    totalEl.textContent = `Rp ${total.toLocaleString()}`;
  } catch (err) {
    console.error("Gagal mengambil data komisi:", err);
    komisiEl.innerHTML = "<p class='text-red-500'>Gagal memuat data komisi.</p>";
    totalEl.textContent = "Rp 0";
  }
}

function formatTanggal(tgl) {
  if (!(tgl instanceof Date)) return "";
  const opsi = { day: 'numeric', month: 'short', year: 'numeric' };
  return tgl.toLocaleDateString('id-ID', opsi);
}
