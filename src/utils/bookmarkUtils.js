// Get bookmarks from localStorage
export const getBookmarks = () => {
  try {
    return JSON.parse(localStorage.getItem('bookmarks') || '[]');
  } catch (err) {
    console.error('Error parsing bookmarks:', err);
    return [];
  }
};

// Add bookmark to localStorage
export const addBookmark = (bookmark) => {
  try {
    const bookmarks = getBookmarks();
    bookmarks.push(bookmark);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    return true;
  } catch (err) {
    console.error('Error adding bookmark:', err);
    return false;
  }
};

// Remove bookmark from localStorage
export const removeBookmark = (bookmarkId) => {
  try {
    const bookmarks = getBookmarks();
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
    return true;
  } catch (err) {
    console.error('Error removing bookmark:', err);
    return false;
  }
};
