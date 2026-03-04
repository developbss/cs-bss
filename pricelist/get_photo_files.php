<?php
$photoFiles = array_diff(scandir('assets/img/lcd/'), ['.', '..']);
foreach ($photoFiles as $photo): 
    if (in_array(strtolower(pathinfo($photo, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif'])): 
?>
    <div style="padding:10px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;">
        • <?= htmlspecialchars($photo) ?>
        <span onclick="renamePhoto('<?= htmlspecialchars($photo) ?>')" style="color:#3498db; cursor:pointer; text-decoration:underline;" title="Rename file">Rename</span>
    </div>
<?php endif; endforeach; ?>