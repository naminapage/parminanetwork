// scripts/komisi.js

async function loadKomisi(db, currentUser) {
  try {
    const userDoc = await db.collection("users").doc(currentUser.username).get();
    const data = userDoc.data();

    if (!data) return;

    // Masukin data komisi ke DOM
    const komisiSponsor = document.querySelector('#komisiSection .komisi-sponsor');
    const komisiMatrix = document.querySelector('#komisiSection .komisi-matrix');
    const totalKomisi = document.querySelector('#komisiSection .total-komisi');

    if (komisiSponsor) komisiSponsor.textContent = `Rp${formatRupiah(data.komisiSponsor || 0)}`;
    if (komisiMatrix) komisiMatrix.textContent = `Rp${formatRupiah(data.komisiMatrix || 0)}`;
    if (totalKomisi) totalKomisi.textContent = `Rp${formatRupiah(data.totalKomisi || 0)}`;
  } catch (err) {
    console.error("Gagal load komisi:", err);
  }
}

// Fungsi bantu rupiah
function formatRupiah(value) {
  return Number(value).toLocaleString("id-ID");
}
