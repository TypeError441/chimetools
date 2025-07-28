$(document).ready(function() {
    fetch("/version.json").then(response => response.json())
    .then(data => {$(".version").text(`v${data.ver}`);
        navigator.serviceWorker.register(`/mp3-metadata-tagger/sw.js?version=${data.ver}`);
    });

    let mp3tag;

    $(".song-icon").hide();
    $(".song-file-name").hide();

    $(".file-input").change(function() {
        const files = $(".file-input")[0].files;
        if (files.length > 0) {
            $(".song-icon").show();
            $(".song-file-name").show();
            $(".song-file-name").text(files[0].name);
            handleFiles(files);
        }
    });

    $(".exit").click(function() { window.location.href = "/"; });

    function handleFiles(files) {
        const file = files[0];
        console.log("Selected", file.name);

        // Convert to ArrayBuffer
        const reader = new FileReader();
        reader.onload = function(e) {
            const buffer = e.target.result;

            mp3tag = new MP3Tag(buffer);
            mp3tag.read();

            if (mp3tag.error) console.error("Error reading mp3:", mp3tag.error);
            else {
                console.log("Current tags:", mp3tag.tags);

                const tags = mp3tag.tags;

                if (tags.v2.APIC && tags.v2.APIC.length > 0) {
                    const pic = tags.v2.APIC[0];
                    const byteArray = Array.isArray(pic.data) ? pic.data : Array.from(pic.data);
                    const blob = new Blob([new Uint8Array(byteArray)], { type: pic.format });
                    const url = URL.createObjectURL(blob);

                    if (window.currentCoverURL) URL.revokeObjectURL(window.currentCoverURL);
                    window.currentCoverURL = url;

                    $(".preview-view-cover").attr("src", url);
                } else {
                    $(".preview-view-cover").attr("src", "https://placehold.co/128x128?text=Cover");
                }

                $(".preview-view-title").text(tags.title || "Unknown Title");
                $(".preview-view-artist").text(tags.artist || "Unknown Artist");

                const metaParts = [];

                if (tags.album) metaParts.push(tags.album);
                if (tags.year || tags.date) metaParts.push(tags.year || tags.date);
                if (tags.v2.TPE2) metaParts.push(tags.v2.TPE2);

                if (metaParts.length > 0) {
                    $(".preview-view-album").text(metaParts[0]);
                    if (metaParts[1]) $(".preview-view-year").text(metaParts[1]);
                    else $(".preview-view-year").text("");
                    if (metaParts[2]) $(".preview-view-album-artist").text(metaParts[2]);
                    else $(".preview-view-album-artist").text("");
                    
                    $(".preview-view-meta").html(
                        metaParts
                            .map(function(part, i) {
                                if (i === 0) return `<span class="preview-view-album">${part}</span>`;
                                if (i === 1) return ` • <span class="preview-view-year">${part}</span>`;
                                if (i === 2) return ` • <span class="preview-view-album-artist">${part}</span>`;
                            })
                            .join("")
                    );
                } else $(".preview-view-meta").empty();

                const trackNum = tags.track || "0";
                $(".preview-view-track").text(`Track ${trackNum}`);
            
                // Set edit inputs
                $("#edit-input-title").val(tags.title || "Unknown Title");
                $("#edit-input-artist").val(tags.artist || "Unknown Artist");
                $("#edit-input-track").val(tags.track || "0");
                $("#edit-input-album-name").val(tags.album);
                $("#edit-input-album-year").val(tags.year);
                $("#edit-input-album-artist").val(tags.v2.TPE2);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function imageURL(bytes, format) {
        let encoded = "";
        bytes.forEach(function(byte) {
            encoded += String.fromCharCode(byte);
        });
        return `data:${format};base64,${btoa(encoded)}`;
    }

    $("#edit-input-title").on("input", function() {
        $(".preview-view-title").text($(this).val());
    });

    $("#edit-input-title").on("input", function() {
        $(".preview-view-title").text($(this).val());
    });

    $("#edit-input-artist").on("input", function() {
        $(".preview-view-artist").text($(this).val());
    });

    $("#edit-input-track").on("input", function() {
        let val = parseInt($(this).val(), 10);
        if (isNaN(val)) val = min;
        if (val < 1) val = min;
        $(this).val(val);

        $(".preview-view-track").text("Track " + val);
    });

    $("#edit-input-album-name").on("input", function() {
        $(".preview-view-album").text($(this).val());
    });

    $("#edit-input-album-year").on("input", function() {
        let val = parseInt($(this).val(), 10);
        if (isNaN(val)) val = min;
        if (val < 1) val = min;
        $(this).val(val);

        $(".preview-view-year").text(val);
    });

    $("#edit-input-album-artist").on("input", function() {
        $(".preview-view-album-artist").text($(this).val());
    });

    $(".download").click(function() {
        if (!mp3tag) return;
        
        const title = $("#edit-input-title").val();
        const artist = $("#edit-input-artist").val();
        const track = $("#edit-input-track").val();
        const album = $("#edit-input-album-name").val();
        const year = $("#edit-input-album-year").val();
        const albumArtist = $("#edit-input-album-artist").val();

        mp3tag.tags.title = title;
        mp3tag.tags.artist = artist;
        mp3tag.tags.track = track;
        mp3tag.tags.album = album;
        mp3tag.tags.year = year;
        if (!mp3tag.tags.v2) mp3tag.tags.v2 = {};
        mp3tag.tags.v2.TPE2 = albumArtist;

        mp3tag.save();

        const blob = new Blob([mp3tag.buffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        // Generate file name with "-edited" or increment if already present
        let originalName = $(".song-file-name").text().trim().split(".mp3")[0];
        let fileName;
        if (originalName.endsWith("-edited")) fileName = originalName + ".mp3";
        fileName = originalName + "-edited.mp3";

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
});