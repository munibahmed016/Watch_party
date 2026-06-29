import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import {
  launchImageLibrary,
  MediaType,
  PhotoQuality,
} from 'react-native-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import ConfirmModal from '@/components/ConfirmModal';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import {
  creatorsApi,
  meApi,
  subscriptionsApi,
  usersApi,
  Creator,
  CreatorContent,
  CreatorEvent,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const fmtCount = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1e6).toFixed(1)}M`
    : n >= 1000
    ? `${(n / 1000).toFixed(1)}K`
    : `${n}`;
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

type TabKey = 'home' | 'about' | 'clips' | 'schedule';

const TIER_COLORS: Record<string, string> = {
  ADVANCE: '#E5E4E2',
  PRO: '#FFD700',
  BASIC: '#C0C0C0',
};

const MyProfileScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<TabKey>('home');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    onYes: () => void;
  }>(null);

  const creatorQuery = useQuery({
    queryKey: ['creator', 'me'],
    queryFn: () => creatorsApi.getMine(),
  });
  const subQuery = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: () => subscriptionsApi.me(),
  });
  const overviewQuery = useQuery({
    queryKey: ['me', 'overview'],
    queryFn: () => meApi.overview(),
  });

  const videosQuery = useQuery({
    queryKey: ['creator', 'my-content', 'FULL'],
    queryFn: () => creatorsApi.myContent('FULL'),
  });
  const clipsQuery = useQuery({
    queryKey: ['creator', 'my-content', 'CLIP'],
    queryFn: () => creatorsApi.myContent('CLIP'),
    enabled: tab === 'clips',
  });

  const creator = creatorQuery.data?.creator as Creator | null | undefined;
  const tier = subQuery.data;
  const overview = overviewQuery.data;
  const isCreator = !!creator && creator.status === 'APPROVED';
  const myUsername = user?.username || '';

  const eventsQuery = useQuery({
    queryKey: ['creator', myUsername, 'events'],
    queryFn: () => creatorsApi.eventsByUsername(myUsername),
    enabled: tab === 'schedule' && !!myUsername && isCreator,
  });

  const tierColor = TIER_COLORS[tier?.tier || 'BASIC'] || colors.primary;

  // ---- change avatar (Cloudinary via usersApi.uploadAvatar) ----
  const changeAvatar = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo' as MediaType,
        selectionLimit: 1,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85 as PhotoQuality,
      });
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setUploadingAvatar(true);
      const { user: updated } = await usersApi.uploadAvatar(
        asset.uri,
        asset.type || 'image/jpeg',
      );
      await setUser(updated);
    } catch (e: any) {
      showApiError(e, 'Could not update photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---- change banner (Cloudinary via creatorsApi.uploadBanner) ----
  const changeBanner = async () => {
    if (!isCreator) return;
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo' as MediaType,
        selectionLimit: 1,
        maxWidth: 1600,
        maxHeight: 900,
        quality: 0.85 as PhotoQuality,
      });
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setUploadingBanner(true);
      await creatorsApi.uploadBanner(asset.uri, asset.type || 'image/jpeg');
      await qc.invalidateQueries({ queryKey: ['creator', 'me'] });
    } catch (e: any) {
      showApiError(e, 'Could not update banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const deleteContent = (item: CreatorContent) => {
    setConfirm({
      title: 'Delete video?',
      message: `"${item.title}" will be permanently removed.`,
      onYes: async () => {
        setConfirm(null);
        try {
          await creatorsApi.deleteContent(item.id);
          qc.invalidateQueries({ queryKey: ['creator', 'my-content', 'FULL'] });
          qc.invalidateQueries({ queryKey: ['creator', 'my-content', 'CLIP'] });
        } catch (e: any) {
          showApiError(e, 'Could not delete.');
        }
      },
    });
  };

  const deleteEvent = (item: CreatorEvent) => {
    setConfirm({
      title: 'Delete event?',
      message: `"${item.title}" will be removed.`,
      onYes: async () => {
        setConfirm(null);
        try {
          await creatorsApi.deleteEvent(item.id);
          await qc.invalidateQueries({
            queryKey: ['creator', myUsername, 'events'],
          });
          await qc.invalidateQueries({ queryKey: ['events', 'upcoming'] });
        } catch (e) {
          showApiError(e, 'Could not delete event.');
        }
      },
    });
  };

  const avatarUri =
    user?.avatarUrl ||
    (creator as any)?.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
      myUsername || 'me',
    )}&backgroundColor=ffdfbf`;
  const displayName =
    creator?.displayName || user?.fullName || user?.username || 'Me';

  const videos = videosQuery.data?.items || [];
  const clips = clipsQuery.data?.items || [];
  const events = eventsQuery.data?.items || [];

  const TABS: [TabKey, string][] = isCreator
    ? [
        ['home', 'Home'],
        ['about', 'About'],
        ['clips', 'Clips'],
        ['schedule', 'Schedule'],
      ]
    : [['about', 'About']];

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Your Profile"
        infoIntro="This is your channel — your uploads, info, clips and schedule."
        infoPoints={[
          {
            icon: 'home',
            title: 'Home',
            text: 'Your uploaded content with views, likes and comments.',
          },
          {
            icon: 'person',
            title: 'About',
            text: 'Your details, plan and account links.',
          },
          {
            icon: 'calendar',
            title: 'Schedule',
            text: 'Your upcoming events.',
          },
        ]}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          {creator?.bannerUrl ? (
            <Image
              source={{ uri: creator.bannerUrl }}
              style={StyleSheet.absoluteFillObject as any}
            />
          ) : (
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint}
              end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View style={styles.bannerShade} />
          {isCreator && (
            <TouchableOpacity
              style={styles.bannerEdit}
              onPress={changeBanner}
              activeOpacity={0.85}
              disabled={uploadingBanner}>
              {uploadingBanner ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Icon name="camera" size={14} color={colors.white} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar with edit */}
        <View style={styles.avatarWrap}>
          <View>
            <Image
              source={{ uri: avatarUri }}
              style={[
                styles.avatar,
                { borderColor: isCreator ? tierColor : colors.background },
              ]}
            />
            <TouchableOpacity
              style={styles.avatarEdit}
              onPress={changeAvatar}
              activeOpacity={0.85}
              disabled={uploadingAvatar}>
              <LinearGradient
                colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint}
                end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              {uploadingAvatar ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Icon name="camera" size={13} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
          {creator?.isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <AppText variant="tiny" bold style={{ fontSize: 9 }}>
                LIVE
              </AppText>
            </View>
          )}
        </View>

        {/* Name */}
        <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <GradientText
              variant="h2"
              center
              style={{ lineHeight: 30, paddingBottom: 2 }}>
              {displayName}
            </GradientText>
            {isCreator && (
              <Icon
                name="checkmark-circle"
                size={18}
                color={colors.primary}
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
          <AppText variant="tiny" color={colors.textSecondary}>
            @{myUsername}
          </AppText>
        </View>

        {/* Stats (creator only) */}
        {isCreator && (
          <View style={styles.statsRow}>
            <Stat
              value={fmtCount(creator!.followerCount)}
              label="Followers"
              onPress={() => navigation.navigate('ManageProfile', { tab: 'followers' })}
            />
            <View style={styles.statDivider} />
            <Stat
              value={fmtCount(creator!.subscriberCount)}
              label="Subscribers"
              onPress={() => navigation.navigate('ManageProfile', { tab: 'subscribers' })}
            />
            <View style={styles.statDivider} />
            <Stat
              value={
                creator!.category.charAt(0) +
                creator!.category.slice(1).toLowerCase()
              }
              label="Category"
            />
          </View>
        )}

        {/* Edit + Go Live */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditProfile')}
            style={[styles.actBtn, styles.actGhost]}>
            <Icon
              name="create-outline"
              size={15}
              color={colors.white}
              style={{ marginRight: 6 }}
            />
            <AppText variant="small" bold color={colors.white}>
              Edit Profile
            </AppText>
          </TouchableOpacity>
          {tier?.canGoLive && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('GoLive')}
              style={[styles.actBtn, { overflow: 'hidden' }]}>
              <LinearGradient
                colors={['#FF3B30', '#FF0000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              <Icon
                name="radio"
                size={15}
                color={colors.white}
                style={{ marginRight: 6 }}
              />
              <AppText variant="small" bold color={colors.white}>
                Go Live
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {TABS.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              style={styles.tabBtn}
              activeOpacity={0.8}>
              {tab === key ? (
                <GradientText variant="small" style={{ paddingBottom: 2 }}>
                  {label}
                </GradientText>
              ) : (
                <AppText variant="small" color={colors.textSecondary}>
                  {label}
                </AppText>
              )}
              {tab === key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          {/* HOME — my uploaded content */}
          {tab === 'home' &&
            isCreator &&
            (videosQuery.isLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: spacing.lg }}
              />
            ) : videos.length === 0 ? (
              <Empty
                icon="film-outline"
                text="No uploads yet. Tap Upload to add content."
              />
            ) : (
              videos.map(v => (
                <MyContentRow
                  key={v.id}
                  item={v}
                  onDelete={() => deleteContent(v)}
                  onEdit={() => navigation.navigate('CreatorUpload')}
                />
              ))
            ))}

          {/* ABOUT — details, plan, account links */}
          {tab === 'about' && (
            <View>
              {creator?.tagline ? (
                <InfoCard
                  icon="pricetag"
                  title="Tagline"
                  body={creator.tagline}
                />
              ) : null}
              {creator?.bio ? (
                <InfoCard icon="document-text" title="Bio" body={creator.bio} />
              ) : null}

              {/* Plan */}
              <TouchableOpacity
                style={styles.planCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Plans')}>
                <View
                  style={[styles.planDot, { backgroundColor: tierColor }]}
                />
                <View style={{ flex: 1 }}>
                  <AppText bold>{tier?.tier || 'Free'} plan</AppText>
                  <AppText variant="tiny" color={colors.textSecondary}>
                    {tier?.canGoLive
                      ? 'Go live + upload + watch'
                      : tier?.canCreate
                      ? 'Upload + watch'
                      : 'Watch, comment & share'}
                  </AppText>
                </View>
                <AppText variant="tiny" bold color={colors.primary}>
                  Manage
                </AppText>
                <Icon
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {/* counts */}
              <View style={styles.miniRow}>
                <MiniStat
                  icon="albums"
                  value={overview?.counts.rooms ?? 0}
                  label="Rooms"
                  onPress={() => navigation.navigate('ManageProfile', { tab: 'rooms' })}
                />
                <MiniStat
                  icon="people"
                  value={overview?.counts.following ?? 0}
                  label="Following"
                  onPress={() => navigation.navigate('ManageProfile', { tab: 'following' })}
                />
                <MiniStat
                  icon="star"
                  value={overview?.counts.subscriptions ?? 0}
                  label="Subscriptions"
                  onPress={() => navigation.navigate('ManageProfile', { tab: 'subscriptions' })}
                />
              </View>

              {/* edit links */}
              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.8}
                onPress={changeAvatar}>
                <Icon
                  name="image"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <AppText variant="small" style={{ flex: 1 }}>
                  Change profile photo
                </AppText>
                <Icon
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('EditProfile')}>
                <Icon
                  name="create"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <AppText variant="small" style={{ flex: 1 }}>
                  Edit name, username & bio
                </AppText>
                <Icon
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {/* Manage everything — rooms, following, subscriptions, audience */}
              <TouchableOpacity
                style={styles.linkRow}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ManageProfile', { tab: 'rooms' })}>
                <Icon
                  name="settings"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <AppText variant="small" style={{ flex: 1 }}>
                  Manage rooms, following & subscribers
                </AppText>
                <Icon
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {isCreator && (
                <TouchableOpacity
                  style={styles.linkRow}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('CreatorDashboard')}>
                  <Icon
                    name="bar-chart"
                    size={16}
                    color={colors.primary}
                    style={{ marginRight: 10 }}
                  />
                  <AppText variant="small" style={{ flex: 1 }}>
                    Creator dashboard
                  </AppText>
                  <Icon
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* CLIPS */}
          {tab === 'clips' &&
            isCreator &&
            (clipsQuery.isLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: spacing.lg }}
              />
            ) : clips.length === 0 ? (
              <Empty icon="cut-outline" text="No clips yet." />
            ) : (
              clips.map(c => (
                <MyContentRow
                  key={c.id}
                  item={c}
                  onDelete={() => deleteContent(c)}
                  onEdit={() => navigation.navigate('CreatorUpload')}
                />
              ))
            ))}

          {/* SCHEDULE */}
          {tab === 'schedule' && isCreator && (
            <View>
              <TouchableOpacity
                style={styles.createEventBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CreateEvent')}>
                <Icon
                  name="add-circle"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <AppText variant="small" bold color={colors.primary}>
                  Create Event
                </AppText>
              </TouchableOpacity>
              {eventsQuery.isLoading ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={{ marginTop: spacing.lg }}
                />
              ) : events.length === 0 ? (
                <Empty icon="calendar-outline" text="No upcoming events." />
              ) : (
                events.map(e => (
                  <EventRow
                    key={e.id}
                    item={e}
                    onEdit={() =>
                      navigation.navigate('CreateEvent', { event: e })
                    }
                    onDelete={() => deleteEvent(e)}
                  />
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message}
        confirmLabel="Delete"
        destructive
        icon="trash-outline"
        onConfirm={() => confirm?.onYes()}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
};

const Stat: React.FC<{ value: string | number; label: string; onPress?: () => void }> = ({
  value,
  label,
  onPress,
}) => {
  const inner = (
    <>
      <AppText variant="h3" bold>
        {value}
      </AppText>
      <AppText
        variant="tiny"
        color={colors.textSecondary}
        style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </>
  );
  return onPress ? (
    <TouchableOpacity style={styles.statBox} activeOpacity={0.8} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  ) : (
    <View style={styles.statBox}>{inner}</View>
  );
};

const MiniStat: React.FC<{
  icon: string;
  value: number;
  label: string;
  onPress?: () => void;
}> = ({ icon, value, label, onPress }) => (
  <TouchableOpacity
    style={styles.miniStat}
    activeOpacity={onPress ? 0.8 : 1}
    onPress={onPress}>
    <Icon name={icon} size={18} color={colors.primary} />
    <AppText bold style={{ marginTop: 4 }}>
      {value}
    </AppText>
    <AppText variant="tiny" color={colors.textSecondary}>
      {label}
    </AppText>
  </TouchableOpacity>
);

const MyContentRow: React.FC<{
  item: CreatorContent;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ item, onDelete, onEdit }) => (
  <View style={styles.contentCard}>
    <View style={styles.contentThumbWrap}>
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.contentThumb}
        />
      ) : (
        <View
          style={[
            styles.contentThumb,
            { alignItems: 'center', justifyContent: 'center' },
          ]}>
          <Icon name="film" size={20} color={colors.textMuted} />
        </View>
      )}
      {item.uploadStatus !== 'APPROVED' && (
        <View style={styles.statusTag}>
          <AppText
            variant="tiny"
            bold
            style={{ fontSize: 8 }}
            color={colors.white}>
            {item.uploadStatus === 'PENDING_REVIEW'
              ? 'IN REVIEW'
              : item.uploadStatus}
          </AppText>
        </View>
      )}
    </View>
    <View style={{ flex: 1, padding: spacing.sm }}>
      <AppText bold numberOfLines={2}>
        {item.title}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 6,
          gap: 12,
        }}>
        <Meta icon="eye" value={fmtCount(item.viewCount)} />
        <Meta icon="heart" value={fmtCount(item.likeCount ?? 0)} />
        <Meta icon="chatbubble" value={fmtCount(item.commentCount ?? 0)} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={onEdit}
          activeOpacity={0.8}>
          <Icon
            name="create-outline"
            size={13}
            color={colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <AppText variant="tiny" color={colors.textSecondary}>
            Edit
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={onDelete}
          activeOpacity={0.8}>
          <Icon
            name="trash-outline"
            size={13}
            color={colors.error}
            style={{ marginRight: 4 }}
          />
          <AppText variant="tiny" color={colors.error}>
            Delete
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const EventRow: React.FC<{
  item: CreatorEvent;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ item, onEdit, onDelete }) => (
  <View style={styles.eventCard}>
    <View style={styles.eventDateBox}>
      <Icon name="calendar" size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText bold numberOfLines={1}>
        {item.title}
      </AppText>
      <AppText
        variant="tiny"
        color={colors.textSecondary}
        style={{ marginTop: 2 }}>
        {fmtDate(item.scheduledAt)}
      </AppText>
    </View>
    <View style={styles.eventStatus}>
      <AppText variant="tiny" bold color={colors.primary}>
        {item.status}
      </AppText>
    </View>
    {onEdit && (
      <TouchableOpacity
        onPress={onEdit}
        hitSlop={8}
        style={{ paddingHorizontal: 6 }}>
        <Icon name="create-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    )}
    {onDelete && (
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={8}
        style={{ paddingLeft: 2 }}>
        <Icon name="trash-outline" size={18} color="#FF5A5A" />
      </TouchableOpacity>
    )}
  </View>
);

const InfoCard: React.FC<{ icon: string; title: string; body: string }> = ({
  icon,
  title,
  body,
}) => (
  <View style={styles.infoCard}>
    <View
      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <Icon
        name={icon}
        size={14}
        color={colors.textSecondary}
        style={{ marginRight: 6 }}
      />
      <AppText variant="tiny" color={colors.textSecondary}>
        {title}
      </AppText>
    </View>
    <AppText style={{ lineHeight: 20 }}>{body}</AppText>
  </View>
);

const Meta: React.FC<{ icon: string; value: string }> = ({ icon, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Icon
      name={icon}
      size={12}
      color={colors.textMuted}
      style={{ marginRight: 3 }}
    />
    <AppText variant="tiny" color={colors.textSecondary}>
      {value}
    </AppText>
  </View>
);

const Empty: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
    <Icon name={icon} size={40} color={colors.textMuted} />
    <AppText
      variant="small"
      color={colors.textSecondary}
      style={{ marginTop: 8 }}
      center>
      {text}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    height: 120,
    marginHorizontal: spacing.lg,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  bannerShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bannerEdit: {
    position: 'absolute',
    top: 10,
    right: spacing.lg + 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarWrap: { alignItems: 'center', marginTop: -44 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    backgroundColor: colors.surfaceElevated,
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
    marginRight: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  actBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actGhost: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.lg,
  },
  tabBtn: { paddingBottom: spacing.sm, alignItems: 'center' },
  tabUnderline: {
    height: 2,
    backgroundColor: colors.primary,
    width: '100%',
    marginTop: 6,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: layout.radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentThumbWrap: { width: 120, height: 100, position: 'relative' },
  contentThumb: {
    width: 120,
    height: 100,
    backgroundColor: colors.surfaceElevated,
  },
  statusTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: layout.radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  eventDateBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(238,48,99,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventStatus: {
    backgroundColor: 'rgba(238,48,99,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md,
    borderRadius: layout.radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 10,
  },
  planDot: { width: 12, height: 12, borderRadius: 6 },
  miniRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    paddingVertical: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(238,48,99,0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: layout.radius.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
});

export default MyProfileScreen;