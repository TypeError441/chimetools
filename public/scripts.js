$(document).ready(function() {
    $(".app").click(function() {
        window.location.href = `/${$(this).attr("id")}/`;
    });
});