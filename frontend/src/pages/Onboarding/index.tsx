import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  FileInput,
  Grid,
  Group,
  Progress,
  RangeSlider,
  Select,
  Slider,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconHeart,
  IconMapPin,
  IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // フォーム状態
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    birthdate: "",
    gender: "",
    photos: [] as File[],
  });

  const [preferences, setPreferences] = useState({
    ageRange: [18, 30] as [number, number],
    maxDistance: 50,
    tags: [] as string[],
  });

  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
    city: "",
    allowLocation: false,
  });

  // 利用可能なタグ
  const availableTags = [
    "アート",
    "音楽",
    "映画",
    "読書",
    "スポーツ",
    "料理",
    "旅行",
    "写真",
    "ゲーム",
    "プログラミング",
    "ヨガ",
    "ダンス",
    "カフェ",
    "お酒",
    "ペット",
    "自然",
    "テクノロジー",
    "ファッション",
    "美容",
    "健康",
  ];

  const steps = [
    { label: "ようこそ", description: "Matchaへようこそ" },
    { label: "プロフィール", description: "基本情報を入力" },
    { label: "好み設定", description: "興味のあることを選択" },
    { label: "位置情報", description: "位置を設定" },
    { label: "完了", description: "設定完了" },
  ];

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setCompletedSteps([...completedSteps, activeStep]);
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleComplete = () => {
    console.log("Onboarding completed:", { profile, preferences, location });
    navigate("/dashboard");
  };

  const toggleTag = (tag: string) => {
    setPreferences((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            allowLocation: true,
          }));
        },
        (error) => {
          console.error("位置情報の取得に失敗しました:", error);
        }
      );
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack align="center" gap="lg" py="md">
            <div style={{ textAlign: "center" }}>
              <Title order={1} size="2.5rem" mb="sm" c="green">
                🍵
              </Title>
              <Title order={2} mb="sm">
                Matchaへようこそ！
              </Title>
              <Text size="md" c="dimmed" maw={400}>
                素敵な出会いを見つけるための最初のステップです。
              </Text>
            </div>

            <Grid gutter="md" style={{ width: "100%", maxWidth: 500 }}>
              <Grid.Col span={6}>
                <Card shadow="sm" padding="md" radius="md" withBorder h="100%">
                  <Stack gap="sm">
                    <Group>
                      <IconHeart size={20} color="var(--mantine-color-green-6)" />
                      <Text fw={500} size="sm">
                        マッチング機能
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      共通の興味や価値観を持つ人とマッチできます
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card shadow="sm" padding="md" radius="md" withBorder h="100%">
                  <Stack gap="sm">
                    <Group>
                      <IconMapPin size={20} color="var(--mantine-color-blue-6)" />
                      <Text fw={500} size="sm">
                        位置ベース検索
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      近くの人を見つけて、実際に会うことができます
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        );

      case 1:
        return (
          <Stack gap="md" py="md">
            <div style={{ textAlign: "center" }}>
              <Title order={3} mb="xs">
                プロフィールを設定しましょう
              </Title>
              <Text size="sm" c="dimmed">
                あなたのことを教えてください
              </Text>
            </div>

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="名"
                  placeholder="太郎"
                  value={profile.firstName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                  required
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="姓"
                  placeholder="田中"
                  value={profile.lastName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                  required
                  size="sm"
                />
              </Grid.Col>
            </Grid>

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="生年月日"
                  type="date"
                  value={profile.birthdate}
                  onChange={(e) => setProfile((prev) => ({ ...prev, birthdate: e.target.value }))}
                  required
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="性別"
                  placeholder="選択してください"
                  data={[
                    { value: "male", label: "男性" },
                    { value: "female", label: "女性" },
                    { value: "other", label: "その他" },
                  ]}
                  value={profile.gender}
                  onChange={(value) => setProfile((prev) => ({ ...prev, gender: value || "" }))}
                  required
                  size="sm"
                />
              </Grid.Col>
            </Grid>

            <Textarea
              label="自己紹介"
              placeholder="あなたのことを教えてください..."
              value={profile.bio}
              onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
              minRows={2}
              maxRows={3}
              size="sm"
            />

            <div>
              <Text size="sm" fw={500} mb="xs">
                写真をアップロード（最大5枚）
              </Text>
              <FileInput
                placeholder="写真を選択"
                leftSection={<IconUpload size={14} />}
                multiple
                accept="image/*"
                onChange={(files) => setProfile((prev) => ({ ...prev, photos: files || [] }))}
                size="sm"
              />
              {profile.photos.length > 0 && (
                <Group gap="xs" mt="sm">
                  {profile.photos.map((file, index) => (
                    <Avatar
                      key={`photo-${file.name}-${index}`}
                      size="sm"
                      src={URL.createObjectURL(file)}
                    />
                  ))}
                </Group>
              )}
            </div>
          </Stack>
        );

      case 2:
        return (
          <Stack gap="md" py="md">
            <div style={{ textAlign: "center" }}>
              <Title order={3} mb="xs">
                好みを設定しましょう
              </Title>
              <Text size="sm" c="dimmed">
                興味のあることを選択してください
              </Text>
            </div>

            <Stack gap="md" mb="xl">
              <Text size="sm" fw={500} mb="xs">
                年齢範囲: {preferences.ageRange[0]}歳 〜{" "}
                {preferences.ageRange[1] === 50 ? "50+歳" : `${preferences.ageRange[1]}歳`}
              </Text>
              <RangeSlider
                value={preferences.ageRange}
                onChange={(value) =>
                  setPreferences((prev) => ({ ...prev, ageRange: value as [number, number] }))
                }
                min={18}
                max={50}
                step={1}
                marks={[
                  { value: 18, label: "18" },
                  { value: 25, label: "25" },
                  { value: 35, label: "35" },
                  { value: 50, label: "50+" },
                ]}
                size="sm"
              />
            </Stack>
            <Stack gap="md" mb="xl">
              <Text size="sm" fw={500} mb="xs">
                最大距離: {preferences.maxDistance}km
              </Text>
              <Slider
                value={preferences.maxDistance}
                onChange={(value) => setPreferences((prev) => ({ ...prev, maxDistance: value }))}
                min={1}
                max={100}
                step={1}
                marks={[
                  { value: 1, label: "1km" },
                  { value: 25, label: "25km" },
                  { value: 50, label: "50km" },
                  { value: 100, label: "100km" },
                ]}
                size="sm"
              />
            </Stack>

            <div>
              <Text size="sm" fw={500} mb="xs">
                興味のあるタグ（複数選択可）
              </Text>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                  gap: "8px",
                  maxHeight: "120px",
                  overflowY: "auto",
                  padding: "8px",
                  border: "1px solid var(--mantine-color-gray-3)",
                  borderRadius: "var(--mantine-radius-sm)",
                }}
              >
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={preferences.tags.includes(tag) ? "filled" : "outline"}
                    color={preferences.tags.includes(tag) ? "green" : "gray"}
                    style={{ cursor: "pointer", fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {preferences.tags.length > 0 && (
                <Text size="xs" c="dimmed" mt="xs">
                  選択済み: {preferences.tags.join(", ")}
                </Text>
              )}
            </div>
          </Stack>
        );

      case 3:
        return (
          <Stack gap="md" py="md">
            <div style={{ textAlign: "center" }}>
              <Title order={3} mb="xs">
                位置情報を設定
              </Title>
              <Text size="sm" c="dimmed">
                近くの人を見つけるために位置情報が必要です
              </Text>
            </div>

            <Alert color="blue" icon={<IconMapPin size={14} />}>
              位置情報は近くの人を見つけるために使用されます。プライバシーは保護されます。
            </Alert>

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <div>
                    <Text fw={500} size="sm">
                      位置情報を許可
                    </Text>
                    <Text size="xs" c="dimmed">
                      より正確なマッチングのために位置情報を使用します
                    </Text>
                  </div>
                  <Checkbox
                    checked={location.allowLocation}
                    onChange={(e) =>
                      setLocation((prev) => ({ ...prev, allowLocation: e.currentTarget.checked }))
                    }
                    size="sm"
                  />
                </Group>

                {location.allowLocation && (
                  <Button
                    variant="outline"
                    leftSection={<IconMapPin size={14} />}
                    onClick={getLocation}
                    size="sm"
                  >
                    現在の位置を取得
                  </Button>
                )}

                {location.latitude !== 0 && location.longitude !== 0 && (
                  <Alert color="green" icon={<IconCheck size={14} />}>
                    位置情報が取得されました
                  </Alert>
                )}
              </Stack>
            </Card>
          </Stack>
        );

      case 4:
        return (
          <Stack align="center" gap="lg" py="md">
            <div style={{ textAlign: "center" }}>
              <Title order={1} size="2.5rem" mb="sm" c="green">
                🎉
              </Title>
              <Title order={2} mb="sm">
                設定完了！
              </Title>
              <Text size="md" c="dimmed" maw={400}>
                素敵な出会いを見つける準備ができました。
              </Text>
            </div>

            <Card shadow="sm" padding="md" radius="md" withBorder maw={400}>
              <Stack gap="sm">
                <Group>
                  <IconCheck size={20} color="var(--mantine-color-green-6)" />
                  <Text fw={500} size="sm">
                    プロフィール設定完了
                  </Text>
                </Group>
                <Group>
                  <IconCheck size={20} color="var(--mantine-color-green-6)" />
                  <Text fw={500} size="sm">
                    好み設定完了
                  </Text>
                </Group>
                <Group>
                  <IconCheck size={20} color="var(--mantine-color-green-6)" />
                  <Text fw={500} size="sm">
                    位置情報設定完了
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Container
        size="md"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          paddingTop: "1rem",
          paddingBottom: "1rem",
        }}
      >
        <Stack gap="md" style={{ flex: 1, overflow: "hidden" }}>
          {/* プログレスバー */}
          <Progress value={(activeStep / (steps.length - 1)) * 100} size="sm" color="green" />

          {/* ステッパー */}
          <Stepper active={activeStep} onStepClick={setActiveStep} allowNextStepsSelect={false}>
            {steps.map((step, index) => (
              <Stepper.Step
                key={`step-${step.label}-${index}`}
                label={step.label}
                description={step.description}
              />
            ))}
          </Stepper>

          {/* ステップコンテンツ */}
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>{renderStepContent()}</div>

          {/* ナビゲーションボタン */}
          <Group justify="space-between" mt="md" style={{ flexShrink: 0 }}>
            <Button
              variant="outline"
              leftSection={<IconArrowLeft size={16} />}
              onClick={prevStep}
              disabled={activeStep === 0}
            >
              戻る
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button color="green" rightSection={<IconCheck size={16} />} onClick={handleComplete}>
                完了
              </Button>
            ) : (
              <Button color="green" rightSection={<IconArrowRight size={16} />} onClick={nextStep}>
                次へ
              </Button>
            )}
          </Group>
        </Stack>
      </Container>
    </div>
  );
};

export default Onboarding;
