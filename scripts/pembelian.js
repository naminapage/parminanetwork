async function prosesPembelian(username, nominal) {
  try {
    const now = new Date();

    // 1. Simpan transaksi pribadi
    await db.collection("transaksi").add({
      userID: username,
      nominal: nominal,
      tanggal: now
    });

    // 2. Tandai user sebagai aktif
    await db.collection("users").doc(username).update({
      statusAktif: true,
      pembelianPribadi: nominal
    });

    // 3. Jalankan distribusi komisi & omzet jaringan
    await hitungKomisi(username, nominal);

    console.log("✅ Transaksi berhasil diproses");
  } catch (err) {
    console.error("❌ Gagal proses pembelian:", err);
  }
}

async function hitungKomisi(username, jumlah) {
  try {
    let currentID = username;

    for (let level = 1; level <= 10; level++) {
      const userDoc = await db.collection("users").doc(currentID).get();
      if (!userDoc.exists) break;

      const userData = userDoc.data();
      const uplineID = userData.parentID;
      if (!uplineID || uplineID === "root") break;

      const uplineRef = db.collection("users").doc(uplineID);
      const uplineDoc = await uplineRef.get();
      const uplineData = uplineDoc.data();

      // ⬆️ Tambah omzet jaringan
      const omzetBaru = (uplineData.omzetJaringan || 0) + jumlah;
      await uplineRef.update({ omzetJaringan: omzetBaru });

      // 💰 Tambah komisi kalau upline aktif
      if (uplineData.statusAktif) {
        const komisi = Math.floor(jumlah * 0.1); // 10% per level
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
    console.error("❌ Gagal hitung komisi:", err);
  }
}
