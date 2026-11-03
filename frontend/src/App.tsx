import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { AuctionItem } from "./types/auction";
import {
  adminLogin,
  createAuctionItem,
  deleteAuctionItem,
  fetchAllItems,
  updateAuctionItem,
} from "./services/api";
import websocketService from "./services/websocket";
import AuctionItemList from "./components/AuctionItemList";
import AuctionDetail from "./components/AuctionDetail";

const AppContainer = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.2), transparent 30%),
    radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.18), transparent 35%),
    linear-gradient(135deg, #f8fafc 0%, #edf6f5 42%, #eef4ff 100%);
  color: #17212f;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  padding: 28px 18px 40px;
`;

const Header = styled.header`
  max-width: 1400px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #0f172a 0%, #102d47 35%, #0f766e 100%);
  color: white;
  padding: 28px 30px;
  border-radius: 28px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const HeaderBadge = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #dbeafe;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const AppTitle = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.04em;
  line-height: 1.1;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(239, 246, 255, 0.82);
  font-size: 0.95rem;
`;

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  background: ${(props) => (props.$connected ? "rgba(34, 197, 94, 0.16)" : "rgba(239, 68, 68, 0.18)")};
  color: white;
  border: 1px solid ${(props) => (props.$connected ? "rgba(134, 239, 172, 0.5)" : "rgba(252, 165, 165, 0.4)")};
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
`;

const StatusDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: inline-block;
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 28px;
  align-items: stretch;

  @media (max-width: 980px) {
    flex-direction: column;
  }
`;

const ErrorBanner = styled.div`
  max-width: 1200px;
  margin: 0 auto 18px;
  padding: 14px 18px;
  background: rgba(239, 68, 68, 0.1);
  color: #991b1b;
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 14px;
  font-weight: 600;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.12);
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08);
`;

const UserProfileName = styled.span`
  color: white;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const UserLabel = styled.label`
  font-weight: 700;
  color: #1e293b;
`;

const UserInput = styled.input`
  padding: 12px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  width: min(100%, 260px);
  font-size: 15px;
  background: white;
  color: #0f172a;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
  }
`;

const AuthShell = styled.section`
  max-width: 1400px;
  margin: 0 auto 24px;
`;

const AuthGrid = styled.div`
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 24px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const AuthCard = styled.div`
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 28px;
  padding: 30px 34px 26px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
`;

const AuthCardDark = styled(AuthCard)`
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%);
  color: white;
`;

const AuthHeader = styled.h2`
  margin: 0 0 18px;
  font-size: clamp(2.1rem, 3vw, 3rem);
  line-height: 1.2;
  letter-spacing: -0.05em;
  color: #0f172a;
`;

const AuthSubText = styled.p`
  margin: 0 0 20px;
  color: #475569;
  font-size: 1.02rem;
  line-height: 1.7;
`;

const AuthCardDarkText = styled(AuthSubText)`
  color: rgba(255, 255, 255, 0.72);
`;

const AdminPanel = styled.section`
  max-width: 1400px;
  margin: 0 auto 24px;
  background: rgba(15, 23, 42, 0.98);
  color: white;
  border-radius: 22px;
  padding: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.15);
`;

const AdminHeader = styled.h2`
  margin: 0 0 18px;
  font-size: 1.5rem;
`;

const AdminLoginForm = styled.form`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: end;
`;

const AuthForm = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: stretch;
`;

const AuthField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AuthFieldFull = styled(AuthField)`
  grid-column: 1 / -1;
`;

const AdminInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.55);
  }

  &:focus {
    outline: none;
    border-color: rgba(45, 212, 191, 0.8);
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.16);
  }
`;

const AuthInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #dfe7ef;
  background: rgba(255, 255, 255, 0.85);
  color: #0f172a;
  font-size: 15px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: #2dd4bf;
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
  }
`;

const AdminTextArea = styled.textarea`
  width: 100%;
  min-height: 110px;
  resize: vertical;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: rgba(45, 212, 191, 0.8);
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.16);
  }
`;

const AdminButton = styled.button`
  padding: 12px 18px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.96;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(AdminButton)`
  background: linear-gradient(135deg, #14b8a6 0%, #2563eb 100%);
  color: white;
`;

const AuthSubmitButton = styled(PrimaryButton)`
  min-width: 160px;
  justify-self: end;
  margin-top: 8px;
  min-height: 52px;
  box-shadow: 0 8px 18px rgba(39, 163, 169, 0.25);
`;

const SecondaryButton = styled(AdminButton)`
  background: rgba(255, 255, 255, 0.12);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const DangerButton = styled(AdminButton)`
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: white;
`;

const AdminFormTitle = styled.h3`
  margin: 18px 0 12px;
  font-size: 1.1rem;
`;

const AdminFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.8fr;
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const AdminActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
`;

const AdminList = styled.div`
  margin-top: 24px;
  display: grid;
  gap: 12px;
`;

const AdminItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.2);

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const AdminItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AdminItemName = styled.span`
  font-weight: 800;
`;

const AdminItemMeta = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

const AdminItemActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const AdminMessage = styled.p<{ $error?: boolean }>`
  margin: 12px 0 0;
  color: ${(props) => (props.$error ? "#fca5a5" : "#a7f3d0")};
  font-weight: 600;
`;

const Footer = styled.footer`
  text-align: center;
  margin-top: 24px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
`;

const AdminStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0 22px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const AdminStatCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 16px;
`;

const AdminStatLabel = styled.div`
  color: rgba(191, 219, 254, 0.82);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
`;

const AdminStatValue = styled.div`
  color: white;
  font-weight: 800;
  font-size: 1.55rem;
  line-height: 1.2;
`;

function App() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [bidderName, setBidderName] = useState<string>("Khách");
  const [error, setError] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>("admin");
  const [adminPassword, setAdminPassword] = useState<string>("admin123");
  const [adminForm, setAdminForm] = useState({
    name: "",
    description: "",
    image: "",
    startingBid: 1000000,
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<"auction" | "auth" | "admin-login">("auction");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [userSession, setUserSession] = useState<{ name: string; email: string } | null>(null);
  const [authForm, setAuthForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
  });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; message: string; time: string }[]>([]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);

  const addNotification = (message: string) => {
    setNotifications((prev) => [
      {
        id: Date.now() + Math.random(),
        message,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...prev,
    ].slice(0, 5));
  };

  const adminStats = useMemo(() => {
    const totalItems = items.length;
    const totalBids = items.reduce((sum, item) => sum + item.bids.length, 0);
    const totalTurnover = items.reduce((sum, item) => sum + item.currentBid, 0);
    const highestItem = items.reduce<AuctionItem | null>((best, item) => {
      if (!best || item.currentBid > best.currentBid) {
        return item;
      }
      return best;
    }, null);

    return {
      totalItems,
      totalBids,
      totalTurnover,
      highestItem,
      activeItems: items.filter((item) => item.bids.length > 0).length,
    };
  }, [items]);

  useEffect(() => {
    const savedUser = localStorage.getItem("auction_user_session");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as { name: string; email: string };
        setUserSession(parsedUser);
        setBidderName(parsedUser.name);
      } catch {
        localStorage.removeItem("auction_user_session");
      }
    }

    const rememberedUsername = localStorage.getItem("auction_last_username");
    if (rememberedUsername) {
      setAuthForm((prev) => ({ ...prev, username: rememberedUsername }));
    }
  }, []);

  const refreshItems = async () => {
    try {
      const data = await fetchAllItems();
      setItems(data);
      setSelectedItem((currentSelectedItem) => {
        if (!currentSelectedItem && data.length > 0) {
          return data[0];
        }

        if (currentSelectedItem) {
          const updatedSelectedItem = data.find(
            (item) => item.id === currentSelectedItem.id
          );
          return updatedSelectedItem ?? data[0] ?? null;
        }

        return null;
      });
    } catch (loadError) {
      console.error("Lỗi khi tải danh sách sản phẩm:", loadError);
      setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
    }
  };

  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoadingItems(true);
        const data = await fetchAllItems();
        setItems(data);
        if (data.length > 0 && !selectedItem) {
          setSelectedItem(data[0]);
        }
        setIsLoadingItems(false);
      } catch (loadError) {
        console.error("Lỗi khi tải danh sách sản phẩm:", loadError);
        setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
        setIsLoadingItems(false);
      }
    };

    loadItems();
  }, []);

  useEffect(() => {
    websocketService.onConnect((connected) => {
      setIsConnected(connected);

      if (!connected) {
        setError("Mất kết nối WebSocket. Đang thử kết nối lại...");
      } else {
        setError(null);
      }
    });

    websocketService.onInitialData((initialItems) => {
      setItems(initialItems);
      setSelectedItem((currentSelectedItem) => {
        if (!currentSelectedItem && initialItems.length > 0) {
          return initialItems[0];
        }

        if (currentSelectedItem) {
          const updatedSelectedItem = initialItems.find(
            (item) => item.id === currentSelectedItem.id
          );
          return updatedSelectedItem ?? initialItems[0] ?? null;
        }

        return null;
      });
    });

    websocketService.onItemUpdate((updatedItem) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      setSelectedItem((currentSelectedItem) =>
        currentSelectedItem && currentSelectedItem.id === updatedItem.id
          ? updatedItem
          : currentSelectedItem
      );

      const latestBid = updatedItem.bids[0];
      if (latestBid) {
        addNotification(
          `${latestBid.bidder} vừa đặt ${formatCurrency(latestBid.amount)} cho ${updatedItem.name}`
        );
      }
    });

    websocketService.onError((message) => {
      setError(message);
      addNotification(message);
      setTimeout(() => setError(null), 5000);
    });

    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedItem) {
      const updatedSelectedItem = items.find(
        (item) => item.id === selectedItem.id
      );
      if (updatedSelectedItem) {
        setSelectedItem(updatedSelectedItem);
      }
    }
  }, [items, selectedItem]);

  const resetAdminForm = () => {
    setEditingItemId(null);
    setAdminForm({
      name: "",
      description: "",
      image: "",
      startingBid: 1000000,
    });
    setAdminMessage(null);
  };

  const handleAdminFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: name === "startingBid" ? Number(value) || 0 : value,
    }));
  };

  const handleSelectItem = (item: AuctionItem) => {
    setSelectedItem(item);
  };

  const handleBidderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidderName(e.target.value);
  };

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminMessage(null);

    try {
      const result = await adminLogin(adminUsername, adminPassword);
      if (result.success) {
        localStorage.setItem("auction_last_username", adminUsername);
        setAuthForm((prev) => ({ ...prev, username: adminUsername }));
        setIsAdminLoggedIn(true);
        setShowAdminLogin(false);
        setCurrentView("auction");
        setAdminMessage("Đăng nhập admin thành công.");
      } else {
        setAdminMessage(result.error || "Đăng nhập thất bại.");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setAdminMessage("Không thể đăng nhập admin.");
    }
  };

  const handleAuthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserRegister = (event: React.FormEvent) => {
    event.preventDefault();
    setAuthMessage(null);

    const trimmedName = authForm.name.trim();
    const trimmedUsername = authForm.username.trim();
    const trimmedEmail = authForm.email.trim();
    const trimmedPassword = authForm.password.trim();
    const trimmedPhone = authForm.phone.trim();

    if (!trimmedName || !trimmedUsername || !trimmedEmail || !trimmedPassword || !trimmedPhone) {
      setAuthMessage("Vui lòng điền đầy đủ họ tên, tài khoản, mật khẩu, số điện thoại và gmail.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("auction_users") || "[]");
    const existedUser = users.find(
      (item: { email: string; username?: string }) =>
        item.email === trimmedEmail || item.username === trimmedUsername
    );

    if (existedUser) {
      setAuthMessage("Tài khoản hoặc email này đã được đăng ký.");
      return;
    }

    const newUser = {
      name: trimmedName,
      username: trimmedUsername,
      email: trimmedEmail,
      phone: trimmedPhone,
      password: trimmedPassword,
    };
    users.push(newUser);
    localStorage.setItem("auction_users", JSON.stringify(users));
    localStorage.setItem("auction_user_session", JSON.stringify({ name: trimmedName, email: trimmedEmail }));
    localStorage.setItem("auction_last_username", trimmedUsername);
    setUserSession({ name: trimmedName, email: trimmedEmail });
    setBidderName(trimmedName);
    setCurrentView("auction");
    setAuthForm({ name: "", username: "", email: "", password: "", phone: "" });
    setAuthMessage("Đăng ký thành công.");
  };

  const handleUserLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setAuthMessage(null);

    const trimmedUsername = authForm.username.trim();
    const trimmedPassword = authForm.password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setAuthMessage("Vui lòng nhập tài khoản và mật khẩu.");
      return;
    }

    if (trimmedUsername === adminUsername && trimmedPassword === adminPassword) {
      localStorage.removeItem("auction_user_session");
      localStorage.setItem("auction_last_username", trimmedUsername);
      setUserSession(null);
      setIsAdminLoggedIn(true);
      setShowAdminLogin(false);
      setCurrentView("auction");
      setAuthForm({ name: "", username: trimmedUsername, email: "", password: "", phone: "" });
      setAdminMessage("Đăng nhập admin thành công.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("auction_users") || "[]");
    const foundUser = users.find(
      (item: { username?: string; password: string }) =>
        item.username === trimmedUsername && item.password === trimmedPassword
    );

    if (!foundUser) {
      setAuthMessage("Tài khoản hoặc mật khẩu không đúng.");
      return;
    }

    const userData = { name: foundUser.name, email: foundUser.email };
    localStorage.setItem("auction_user_session", JSON.stringify(userData));
    localStorage.setItem("auction_last_username", trimmedUsername);
    setUserSession(userData);
    setBidderName(foundUser.name);
    setCurrentView("auction");
    setAuthForm({ name: "", username: trimmedUsername, email: "", password: "", phone: "" });
    setAuthMessage("Đăng nhập thành công.");
  };

  const handleLogout = () => {
    localStorage.removeItem("auction_user_session");
    setUserSession(null);
    setBidderName("Khách");
    setCurrentView("auction");
    setAuthMode("login");
    setAuthMessage(null);
  };

  const handleAdminSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingAdmin(true);
    setAdminMessage(null);

    try {
      if (!adminForm.name.trim() || !adminForm.description.trim() || !adminForm.startingBid) {
        setAdminMessage("Vui lòng điền đầy đủ thông tin sản phẩm.");
        return;
      }

      const payload = {
        name: adminForm.name.trim(),
        description: adminForm.description.trim(),
        image: adminForm.image.trim() || undefined,
        startingBid: Number(adminForm.startingBid),
      };

      if (editingItemId !== null) {
        await updateAuctionItem(editingItemId, payload);
        setAdminMessage("Cập nhật sản phẩm thành công.");
      } else {
        await createAuctionItem(payload);
        setAdminMessage("Thêm sản phẩm mới thành công.");
      }

      await refreshItems();
      resetAdminForm();
    } catch (err) {
      console.error("Admin product action error:", err);
      setAdminMessage("Thao tác quản lý sản phẩm thất bại.");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleEditItem = (item: AuctionItem) => {
    setEditingItemId(item.id);
    setAdminForm({
      name: item.name,
      description: item.description,
      image: item.image || "",
      startingBid: item.startingBid,
    });
    setAdminMessage("Đang sửa sản phẩm...");
  };

  const handleDeleteItem = async (itemId: number) => {
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn xoá sản phẩm này?");
    if (!confirmDelete) return;

    try {
      await deleteAuctionItem(itemId);
      setAdminMessage("Đã xoá sản phẩm.");
      await refreshItems();
      if (selectedItem && selectedItem.id === itemId) {
        const nextItem = items.find((item) => item.id !== itemId) || null;
        setSelectedItem(nextItem);
      }
      if (editingItemId === itemId) {
        resetAdminForm();
      }
    } catch (err) {
      console.error("Delete product error:", err);
      setAdminMessage("Xoá sản phẩm thất bại.");
    }
  };

  return (
    <AppContainer>
      <Header>
        <HeaderTop>
          <HeaderMeta>
            <HeaderTitleRow>
              <HeaderBadge>Live Auction</HeaderBadge>
              <ConnectionStatus $connected={isConnected}>
                <StatusDot />
                {isConnected ? "Đã kết nối" : "Đang kết nối..."}
              </ConnectionStatus>
            </HeaderTitleRow>
            <AppTitle>{isAdminLoggedIn ? "Khu vực quản trị" : "Sàn đấu giá trực tiếp"}</AppTitle>
            <Subtitle>
              {isAdminLoggedIn
                ? "Quản lý sản phẩm, giá khởi điểm và danh sách đấu giá"
                : "Theo dõi giá, đặt giá và cập nhật tức thì qua WebSocket"}
            </Subtitle>
          </HeaderMeta>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {!isAdminLoggedIn && !userSession && (
              <>
                <PrimaryButton
                  type="button"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setCurrentView("auth");
                    setAuthMode("login");
                  }}
                  style={{ minWidth: 120 }}
                >
                  Đăng nhập
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setCurrentView("auth");
                    setAuthMode("register");
                  }}
                  style={{ minWidth: 120 }}
                >
                  Đăng ký
                </SecondaryButton>
              </>
            )}

            {userSession && (
              <UserInfo>
                <UserProfileName>{userSession.name}</UserProfileName>
                <PrimaryButton type="button" onClick={handleLogout}>
                  Đăng xuất
                </PrimaryButton>
              </UserInfo>
            )}

            {isAdminLoggedIn && (
              <SecondaryButton
                type="button"
                onClick={() => {
                  setIsAdminLoggedIn(false);
                  setShowAdminLogin(false);
                  setCurrentView("auction");
                  resetAdminForm();
                }}
                style={{ minWidth: 170 }}
              >
                Về giao diện người dùng
              </SecondaryButton>
            )}
          </div>
        </HeaderTop>
      </Header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {currentView === "auth" ? (
        <AuthShell>
          <AuthCard style={{ maxWidth: 720, margin: "0 auto" }}>
            <AuthHeader>{authMode === "login" ? "Đăng nhập" : "Đăng ký"}</AuthHeader>
            <AuthSubText>
              Chào mừng bạn đến với hệ thống đấu giá trực tiếp. Đăng nhập để tham gia đặt giá hoặc đăng ký tài khoản mới.
            </AuthSubText>

            {authMode === "login" ? (
              <AuthForm onSubmit={handleUserLogin}>
                <AuthField>
                  <UserLabel htmlFor="loginUsername">Tài khoản</UserLabel>
                  <AuthInput
                    id="loginUsername"
                    name="username"
                    value={authForm.username}
                    onChange={handleAuthChange}
                    placeholder="admin"
                  />
                </AuthField>
                <AuthField>
                  <UserLabel htmlFor="loginPassword">Mật khẩu</UserLabel>
                  <AuthInput
                    id="loginPassword"
                    name="password"
                    type="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="Nhập mật khẩu"
                  />
                </AuthField>
                <AuthFieldFull>
                  <AuthSubmitButton type="submit" style={{ justifySelf: "start" }}>Đăng nhập</AuthSubmitButton>
                </AuthFieldFull>
              </AuthForm>
            ) : (
              <AuthForm onSubmit={handleUserRegister}>
                <AuthField>
                  <UserLabel htmlFor="registerName">Họ và tên</UserLabel>
                  <AuthInput
                    id="registerName"
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    placeholder="Nguyễn Văn A"
                  />
                </AuthField>
                <AuthField>
                  <UserLabel htmlFor="registerUsername">Tài khoản</UserLabel>
                  <AuthInput
                    id="registerUsername"
                    name="username"
                    value={authForm.username}
                    onChange={handleAuthChange}
                    placeholder="user01"
                  />
                </AuthField>
                <AuthField>
                  <UserLabel htmlFor="registerPassword">Mật khẩu</UserLabel>
                  <AuthInput
                    id="registerPassword"
                    name="password"
                    type="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="Nhập mật khẩu"
                  />
                </AuthField>
                <AuthField>
                  <UserLabel htmlFor="registerPhone">Số điện thoại</UserLabel>
                  <AuthInput
                    id="registerPhone"
                    name="phone"
                    value={authForm.phone}
                    onChange={handleAuthChange}
                    placeholder="0901234567"
                  />
                </AuthField>
                <AuthField>
                  <UserLabel htmlFor="registerEmail">Gmail</UserLabel>
                  <AuthInput
                    id="registerEmail"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder="email@gmail.com"
                  />
                </AuthField>
                <AuthFieldFull>
                  <AuthSubmitButton type="submit" style={{ justifySelf: "start" }}>Đăng ký</AuthSubmitButton>
                </AuthFieldFull>
              </AuthForm>
            )}

            {authMessage && (
              <AdminMessage $error={authMessage.includes("không") || authMessage.includes("đã") || authMessage.includes("Vui lòng")}>{authMessage}</AdminMessage>
            )}

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-start" }}>
              <SecondaryButton type="button" onClick={() => setCurrentView("auction")}>
                Quay lại
              </SecondaryButton>
            </div>
          </AuthCard>
        </AuthShell>
      ) : isAdminLoggedIn ? (
        <AdminPanel>
          <AdminHeader>Admin - Quản lý sản phẩm</AdminHeader>

          <AdminStatsGrid>
            <AdminStatCard>
              <AdminStatLabel>Tổng sản phẩm</AdminStatLabel>
              <AdminStatValue>{adminStats.totalItems}</AdminStatValue>
            </AdminStatCard>
            <AdminStatCard>
              <AdminStatLabel>Tổng lượt bid</AdminStatLabel>
              <AdminStatValue>{adminStats.totalBids}</AdminStatValue>
            </AdminStatCard>
            <AdminStatCard>
              <AdminStatLabel>Đang có bid</AdminStatLabel>
              <AdminStatValue>{adminStats.activeItems}</AdminStatValue>
            </AdminStatCard>
            <AdminStatCard>
              <AdminStatLabel>Giá cao nhất</AdminStatLabel>
              <AdminStatValue>
                {adminStats.highestItem ? formatCurrency(adminStats.highestItem.currentBid) : "0đ"}
              </AdminStatValue>
            </AdminStatCard>
          </AdminStatsGrid>

          <AdminFormTitle>{editingItemId !== null ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</AdminFormTitle>
          <form onSubmit={handleAdminSubmit}>
            <AdminFormGrid>
              <div>
                <UserLabel htmlFor="productName">Tên sản phẩm</UserLabel>
                <AdminInput
                  id="productName"
                  name="name"
                  value={adminForm.name}
                  onChange={handleAdminFormChange}
                  placeholder="Nhập tên sản phẩm"
                />
              </div>
              <div>
                <UserLabel htmlFor="productImage">Hình ảnh (URL)</UserLabel>
                <AdminInput
                  id="productImage"
                  name="image"
                  value={adminForm.image}
                  onChange={handleAdminFormChange}
                  placeholder="https://..."
                />
              </div>
              <div>
                <UserLabel htmlFor="productPrice">Giá khởi điểm</UserLabel>
                <AdminInput
                  id="productPrice"
                  name="startingBid"
                  type="number"
                  min="1000"
                  step="1000"
                  value={adminForm.startingBid}
                  onChange={handleAdminFormChange}
                />
              </div>
            </AdminFormGrid>

            <div style={{ marginTop: "14px" }}>
              <UserLabel htmlFor="productDescription">Mô tả</UserLabel>
              <AdminTextArea
                id="productDescription"
                name="description"
                value={adminForm.description}
                onChange={handleAdminFormChange}
                placeholder="Nhập mô tả sản phẩm"
              />
            </div>

            <AdminActionRow>
              <PrimaryButton type="submit" disabled={isSubmittingAdmin}>
                {isSubmittingAdmin
                  ? "Đang xử lý..."
                  : editingItemId !== null
                    ? "Lưu thay đổi"
                    : "Thêm sản phẩm"}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={resetAdminForm}>
                Hủy
              </SecondaryButton>
            </AdminActionRow>
          </form>

          <AdminFormTitle>Danh sách sản phẩm hiện có</AdminFormTitle>
          <AdminList>
            {items.map((item) => (
              <AdminItem key={item.id}>
                <AdminItemInfo>
                  <AdminItemName>{item.name}</AdminItemName>
                  <AdminItemMeta>
                    Giá khởi điểm: {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                      maximumFractionDigits: 0,
                    }).format(item.startingBid)}
                  </AdminItemMeta>
                </AdminItemInfo>

                <AdminItemActions>
                  <SecondaryButton type="button" onClick={() => handleEditItem(item)}>
                    Sửa
                  </SecondaryButton>
                  <DangerButton type="button" onClick={() => handleDeleteItem(item.id)}>
                    Xoá
                  </DangerButton>
                </AdminItemActions>
              </AdminItem>
            ))}
          </AdminList>

          {adminMessage && (
            <AdminMessage $error={adminMessage.includes("thất bại") || adminMessage.includes("không") || adminMessage.includes("Vui lòng")}>{adminMessage}</AdminMessage>
          )}
        </AdminPanel>
      ) : (
        <>
          <MainContent>
            <AuctionItemList
              items={items}
              isLoading={isLoadingItems}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectItem}
            />

            {selectedItem && (
              <AuctionDetail
                item={selectedItem}
                bidderName={bidderName}
                websocketConnected={isConnected}
                notifications={notifications}
              />
            )}
          </MainContent>
        </>
      )}

      <Footer>
        <p>Live Auction Platform — Demo WebSocket</p>
      </Footer>
    </AppContainer>
  );
}

export default App;
