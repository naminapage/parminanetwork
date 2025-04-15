// Fungsi utama dipanggil setelah user beli
async function prosesPembelian(username, nominal) {
  try {
    const now = new Date();

    // 1. Catat transaksi
    await db.collection("transaksi").add({
      userID: username,
      nominal: nominal,
      tanggal: now
    });

    // 2. Update statusAktif user
    await db.collection("users").doc(username).update({
      statusAktif: true
    });

    // 3. Hitung komisi + update omzet jaringan
    await hitungKomisi(username, nominal);

    console.log("Transaksi berhasil diproses.");
  } catch (err) {
    console.error("Gagal proses pembelian:", err);
  }
}

async function hitungKomisi(username, jumlah) {
  try {
    let currentID = username;
    for (let level = 1; level <= 10; level++) {
      const userDoc = await db.collection("users").doc(currentID).get();
      if (!userDoc.exists) break;

      const data = userDoc.data();
      const uplineID = data.parentID;
      if (!uplineID || uplineID === 'root') break;

      const uplineRef = db.collection("users").doc(uplineID);
      const uplineSnap = await uplineRef.get();
      const uplineData = uplineSnap.data();

      // ⬆️ Tambah omzet jaringan ke upline (selalu, meskipun tidak aktif)
      const omzetBaru = (uplineData.omzetJaringan || 0) + jumlah;
      await uplineRef.update({
        omzetJaringan: omzetBaru
      });

      // 💰 Komisi hanya kalau upline aktif
      if (uplineData.statusAktif) {
        const komisi = Math.floor(jumlah * 0.1); // 10%
        await db.collection("komisi").add({
          userID: uplineID,
          dariUser: username,
          jumlah: komisi,
          level: level,
          tanggal: new Date()
        });
      }

      currentID = uplineID;
    }
  } catch (err) {
    console.error("Gagal hitung komisi & omzet:", err);
  }
}
