import {
  Anchor,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCalendar, IconLock, IconMail, IconUser } from "@tabler/icons-react";
import { useState } from "react";

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string | null>("login");

  // フォーム状態
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    birthdate: "",
    agreeToTerms: false,
  });

  const [forgotForm, setForgotForm] = useState({
    email: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login:", loginForm);
    // TODO: 実際のログイン処理を実装
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Register:", registerForm);
    // TODO: 実際の登録処理を実装
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Forgot password:", forgotForm);
    // TODO: 実際のパスワードリセット処理を実装
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <div style={{ textAlign: "center" }}>
          <Title order={1} mb="sm">
            Matcha
          </Title>
          <Text c="dimmed" size="lg">
            素敵な出会いを見つけましょう
          </Text>
        </div>

        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="login">ログイン</Tabs.Tab>
              <Tabs.Tab value="register">新規登録</Tabs.Tab>
              <Tabs.Tab value="forgot">パスワードリセット</Tabs.Tab>
            </Tabs.List>

            {/* ログインタブ */}
            <Tabs.Panel value="login" pt="md">
              <form onSubmit={handleLogin}>
                <Stack gap="md">
                  <TextInput
                    label="メールアドレス"
                    placeholder="your@email.com"
                    leftSection={<IconMail size={16} />}
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />

                  <PasswordInput
                    label="パスワード"
                    placeholder="パスワードを入力"
                    leftSection={<IconLock size={16} />}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />

                  <Group justify="space-between">
                    <Checkbox label="ログイン状態を保持" />
                    <Anchor size="sm" onClick={() => setActiveTab("forgot")}>
                      パスワードを忘れた場合
                    </Anchor>
                  </Group>

                  <Button type="submit" fullWidth size="md">
                    ログイン
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            {/* 新規登録タブ */}
            <Tabs.Panel value="register" pt="md">
              <form onSubmit={handleRegister}>
                <Stack gap="md">
                  <TextInput
                    label="メールアドレス"
                    placeholder="your@email.com"
                    leftSection={<IconMail size={16} />}
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                  />

                  <TextInput
                    label="ユーザー名"
                    placeholder="username"
                    leftSection={<IconUser size={16} />}
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    required
                  />

                  <Group grow>
                    <TextInput
                      label="名"
                      placeholder="太郎"
                      value={registerForm.firstName}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, firstName: e.target.value })
                      }
                      required
                    />
                    <TextInput
                      label="姓"
                      placeholder="田中"
                      value={registerForm.lastName}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, lastName: e.target.value })
                      }
                      required
                    />
                  </Group>

                  <TextInput
                    label="生年月日"
                    type="date"
                    leftSection={<IconCalendar size={16} />}
                    value={registerForm.birthdate}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, birthdate: e.target.value })
                    }
                    required
                  />

                  <PasswordInput
                    label="パスワード"
                    placeholder="パスワードを入力"
                    leftSection={<IconLock size={16} />}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                  />

                  <PasswordInput
                    label="パスワード確認"
                    placeholder="パスワードを再入力"
                    leftSection={<IconLock size={16} />}
                    value={registerForm.confirmPassword}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                    }
                    required
                  />

                  <Checkbox
                    label="利用規約とプライバシーポリシーに同意する"
                    checked={registerForm.agreeToTerms}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, agreeToTerms: e.currentTarget.checked })
                    }
                    required
                  />

                  <Button type="submit" fullWidth size="md">
                    アカウント作成
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            {/* パスワードリセットタブ */}
            <Tabs.Panel value="forgot" pt="md">
              <form onSubmit={handleForgotPassword}>
                <Stack gap="md">
                  <Text c="dimmed" size="sm">
                    パスワードリセット用のリンクをメールアドレスに送信します
                  </Text>

                  <TextInput
                    label="メールアドレス"
                    placeholder="your@email.com"
                    leftSection={<IconMail size={16} />}
                    value={forgotForm.email}
                    onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
                    required
                  />

                  <Button type="submit" fullWidth size="md">
                    リセットリンクを送信
                  </Button>

                  <Divider />

                  <Group justify="center">
                    <Anchor size="sm" onClick={() => setActiveTab("login")}>
                      ログインに戻る
                    </Anchor>
                  </Group>
                </Stack>
              </form>
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
};

export default AuthPage;
