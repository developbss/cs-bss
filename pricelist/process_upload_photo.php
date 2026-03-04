<?php
require 'config.php';

if (isset($_POST['action']) && $_POST['action'] === 'upload_photo') {
    $photo = $_FILES['photo'];
    $allowed_mime = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if ($photo['error'] == 0 && in_array($photo['type'], $allowed_mime)) {
        
        $name = basename($photo['name']);
        $info = pathinfo($name);
        // Tetap paksa ke .jpg agar size minimal
        $clean_name = $info['filename'] . '.jpg';
        $target_file = "assets/img/lcd/" . $clean_name;

        // Ambil dimensi asli
        $image_info = getimagesize($photo['tmp_name']);
        if (!$image_info) {
            header('Location: index.php?photo_upload=error&msg=invalid_image');
            exit;
        }
        
        list($width_orig, $height_orig) = $image_info;
        $max_width = 1200; 
        $width = $width_orig;
        $height = $height_orig;

        // Hitung proporsi resize
        if ($width_orig > $max_width) {
            $width = $max_width;
            $height = floor($height_orig * ($max_width / $width_orig));
        }

        // 1. Buat kanvas baru
        $image_p = imagecreatetruecolor($width, $height);

        // 2. IDENTIFIKASI & BUAT SUMBER (Fix untuk PNG/GIF agar tidak error)
        if ($photo['type'] === 'image/png') {
            $source_img = imagecreatefrompng($photo['tmp_name']);
            // Tambahan: Agar background transparan jadi PUTIH (bukan hitam)
            $white = imagecolorallocate($image_p, 255, 255, 255);
            imagefill($image_p, 0, 0, $white);
        } elseif ($photo['type'] === 'image/gif') {
            $source_img = imagecreatefromgif($photo['tmp_name']);
        } else {
            $source_img = imagecreatefromjpeg($photo['tmp_name']);
        }

        // Cek jika resource gambar gagal dibuat
        if (!$source_img) {
            header('Location: index.php?photo_upload=error&msg=resource_failed');
            exit;
        }

        // 3. PROSES RESIZE & RESAMPLE
        imagecopyresampled($image_p, $source_img, 0, 0, 0, 0, $width, $height, $width_orig, $height_orig);

        // Hapus file lama jika ada (Overwrite)
        if (file_exists($target_file)) {
            unlink($target_file);
        }

        // 4. SIMPAN DENGAN KOMPRESI (Kualitas 75 adalah standar terbaik)
        $upload_process = imagejpeg($image_p, $target_file, 75);
        
        // Bersihkan memori server
        imagedestroy($image_p);
        imagedestroy($source_img);

        if ($upload_process) {
            header('Location: index.php?photo_upload=success&file=' . urlencode($clean_name));
        } else {
            header('Location: index.php?photo_upload=error&msg=save_failed');
        }
    } else {
        header('Location: index.php?photo_upload=error&msg=wrong_format_or_error');
    }
    exit;
}

// ... Sisa kode Delete & Rename jangan diubah ...
// (Gunakan kode yang sudah lo punya untuk bagian bawah file ini)