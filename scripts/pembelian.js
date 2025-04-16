// Fungsi utama untuk mencatat pembelian user dan proses efeknya
async function catatPembelian(nominal) {
  const user = window.currentUser;
  if (!user || !user.username) {
    alert("User tidak valid.");
    return;
  }

  const now = new Date();

  try {
    // 1. Simpan transaksi
    const transaksiRef = await db.collection("transaksi").add({
      userID: user.username,
      email: user.email,
      nominal: nominal,
      tanggal: now
    });

    // 2. Update status aktif & pembelian pribadi
    await db.collection("users").doc(user.username).update({
      pembelianPribadi: nominal,
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
