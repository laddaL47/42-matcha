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
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconLock, IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const navigate = useNavigate();

  // フォーム状態
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [forgotForm, setForgotForm] = useState({
    email: "",
  });

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login:", loginForm);
    // TODO: 実際のログイン処理を実装
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Forgot password:", forgotForm);
    // TODO: 実際のパスワードリセット処理を実装
  };

  const handleGoToOnboarding = () => {
    navigate("/onboarding");
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <div style={{ textAlign: "center" }}>
          <Title order={1} mb="sm">
            🍵 Matcha
          </Title>
          <Text c="dimmed" size="lg">
            素敵な出会いを見つけましょう
          </Text>
        </div>

        {/* 認証フォーム */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Stack gap="xl">
            {/* 新規アカウント作成セクション */}
            <Stack gap="md">
              <Text size="lg" fw={500} ta="center">
                新しいアカウントを作成
              </Text>
              <Text c="dimmed" size="sm" ta="center">
                アカウントをお持ちでない方はこちらから始めましょう
              </Text>
              <Button fullWidth size="lg" onClick={handleGoToOnboarding}>
                新規アカウント作成
              </Button>
            </Stack>

            <Divider />

            {/* ログインセクション */}
            <Stack gap="md">
              <Text size="lg" fw={500} ta="center">
                アカウントをお持ちですか？
              </Text>

              {!showForgotPassword ? (
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
                      <Anchor size="sm" onClick={() => setShowForgotPassword(true)}>
                        パスワードを忘れた場合
                      </Anchor>
                    </Group>

                    <Button type="submit" fullWidth size="md">
                      ログイン
                    </Button>
                  </Stack>
                </form>
              ) : (
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
                      <Anchor size="sm" onClick={handleBackToLogin}>
                        ログインに戻る
                      </Anchor>
                    </Group>
                  </Stack>
                </form>
              )}
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};

export default AuthPage;
