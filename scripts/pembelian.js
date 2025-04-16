async function catatPembelian(nominal) {
  const user = window.currentUser;
  if (!user || !user.username) {
    alert("User tidak valid.");
    return;
  }

  const now = new Date();
  const tahun = now.getFullYear();
  const bulan = now.getMonth();
  const awalCutOff = new Date(bulan === 0 ? tahun - 1 : tahun, bulan - 1, 26);
  const akhirCutOff = new Date(tahun, bulan, 25);
  const cairTanggal = new Date(akhirCutOff.getFullYear(), akhirCutOff.getMonth() + 1, 10);

  try {
    // Cek apakah ini pembelian pertama bulan ini (cut-off)
    const transaksiSnapshot = await db.collection("transaksi")
      .where("userID", "==", user.username)
      .where("tanggal", ">=", awalCutOff)
      .where("tanggal", "<=", akhirCutOff)
      .get();

    const isPembelianPertama = transaksiSnapshot.empty;

    // Simpan transaksi
    await db.collection("transaksi").add({
      userID: user.username,
      jumlah: nominal,
      tanggal: now
    });

    // Update pembelian pribadi & status aktif
    await db.collection("users").doc(user.username).update({
      pembelianPribadi: firebase.firestore.FieldValue.increment(nominal),
      statusAktif: true
    });

    const userDoc = await db.collection("users").doc(user.username).get();
    const dataUser = userDoc.data();

    if (isPembelianPertama) {
      // === Komisi Sponsor ===
      if (dataUser.sponsorID && dataUser.sponsorID !== 'root') {
        await db.collection("komisi").add({
          userID: dataUser.sponsorID,
          sumber: user.username,
          jenis: "Sponsor",
          nominal: Math.floor(nominal * 0.1), // 10%
          tanggal: now,
          cairTanggal,
          status: "pending"
        });

        await db.collection("users").doc(dataUser.sponsorID).update({
          omzetJaringan: firebase.firestore.FieldValue.increment(nominal)
        });
      }

      // === Komisi Matrix ===
      let currentID = dataUser.parentID;
      for (let level = 1; level <= 10 && currentID && currentID !== 'root'; level++) {
        const uplineRef = db.collection("users").doc(currentID);
        const uplineDoc = await uplineRef.get();
        if (!uplineDoc.exists) break;

        const dataUpline = uplineDoc.data();

        // Tambah omzet jaringan
        await uplineRef.update({
          omzetJaringan: firebase.firestore.FieldValue.increment(nominal)
        });

        // Komisi hanya jika upline aktif
        if (dataUpline.statusAktif) {
          await db.collection("komisi").add({
            userID: currentID,
            sumber: user.username,
            jenis: `Matrix Lv${level}`,
            nominal: Math.floor(nominal * 0.05), // 5%
            tanggal: now,
            cairTanggal,
            status: "pending"
          });
        }

        currentID = dataUpline.parentID;
      }

    } else {
      // === Komisi Loyalty untuk pembelian kedua dst. ===
      await db.collection("komisi").add({
        userID: user.username,
        sumber: user.username,
        jenis: "Loyalty",
        nominal: 5000, // bisa dibuat dinamis kalau mau
        tanggal: now,
        cairTanggal,
        status: "pending"
      });
    }

    alert("Transaksi berhasil dicatat!");
  } catch (err) {
    console.error("Gagal catat pembelian:", err);
    alert("Gagal mencatat pembelian.");
  }
}
