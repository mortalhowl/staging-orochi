import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component này sẽ tự động cuộn trang lên đầu mỗi khi có sự thay đổi về đường dẫn (route).
 */
function ScrollToTop() {
  // Lấy ra `pathname` (ví dụ: "/about", "/contact") từ location hiện tại.
  const { pathname } = useLocation();

  // Sử dụng `useEffect` để thực hiện một hành động mỗi khi `pathname` thay đổi.
  useEffect(() => {
    // Cuộn cửa sổ lên vị trí (0, 0) - tức là lên trên cùng.
    window.scrollTo(0, 0);
  }, [pathname]); // Mảng phụ thuộc, effect sẽ chạy lại khi giá trị này thay đổi.

  // Component này không render ra giao diện gì cả.
  return null;
}

export default ScrollToTop;