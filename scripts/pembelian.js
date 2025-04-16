async function catatPembelian(nominal) {
  const user = window.currentUser;
  if (!user || !user.username) {
    alert("User tidak valid.");
    return;
  }

  const now = new Date();

  try {
    // 1. Simpan transaksi
  const now = new Date();
  const tahun = now.getFullYear();
  const bulan = now.getMonth();
  const awalCutOff = new Date(bulan === 0 ? tahun - 1 : tahun, bulan - 1, 26);
  const akhirCutOff = new Date(tahun, bulan, 25);

  const transaksiSnapshot = await db.collection("transaksi")
    .where("userID", "==", userID)
    .where("tanggal", ">=", awalCutOff)
    .where("tanggal", "<=", akhirCutOff)
    .get();

  const isPembelianPertama = transaksiSnapshot.empty;

    // 2. Update status aktif & pembelian pribadi
    await db.collection("users").doc(user.username).update({
      pembelianPribadi: firebase.firestore.FieldValue.increment(nominal),
      statusAktif: true
    });

    // 3. Proses komisi sponsor
    const userDoc = await db.collection("users").doc(user.username).get();
    const dataUser = userDoc.data();

    if (dataUser.sponsorID && dataUser.sponsorID !== 'root') {
      const sponsorRef = db.collection("users").doc(dataUser.sponsorID);

      // Tambahkan komisi sponsor ke koleksi komisi
      await db.collection("komisi").add({
        userID: dataUser.sponsorID,
        sumber: user.username,
        jenis: "Sponsor",
        nominal: 20000,
        tanggal: now
      });

      // Update total omzet sponsor
      await sponsorRef.update({
        omzetJaringan: firebase.firestore.FieldValue.increment(nominal)
      });
    }

    // 4. Proses komisi matrix (hingga 10 level)
    let currentID = dataUser.parentID;
    for (let level = 1; level <= 10 && currentID && currentID !== 'root'; level++) {
      const uplineRef = db.collection("users").doc(currentID);
      const uplineDoc = await uplineRef.get();

      if (uplineDoc.exists) {
        const dataUpline = uplineDoc.data();

        // Tambahkan komisi matrix hanya jika status aktif
        if (dataUpline.statusAktif) {
          await db.collection("komisi").add({
            userID: currentID,
            sumber: user.username,
            jenis: `Matrix Lv${level}`,
            nominal: 10000,
            tanggal: now
          });
        }

        // Tambah omzet jaringan upline (tetap ditambahkan meskipun tidak aktif)
        await uplineRef.update({
          omzetJaringan: firebase.firestore.FieldValue.increment(nominal)
        });

        currentID = dataUpline.parentID;
      } else {
        break;
      }
    }

    alert("Transaksi berhasil dicatat!");
  } catch (err) {
    console.error("Gagal catat pembelian:", err);
    alert("Gagal mencatat pembelian.");
  }
}
