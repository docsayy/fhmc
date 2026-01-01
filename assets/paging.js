window.Paging = {
  async send(pager) {
    const msg = prompt("Message (optional):", "") || "Please call back.";
    alert(`Would send page to 11611${pager}@myairmail.com\n\nMessage:\n${msg}`);
  }
};
