# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# React Native Firebase
-keep class io.invertase.firebase.** { *; }

# Google Sign-In
-keep class com.google.android.gms.auth.** { *; }

# SQLite
-keep class org.pgsqlite.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# React Navigation / Screens
-keep class com.swmansion.rnscreens.** { *; }

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Don't strip enums
-keepclassmembers enum * { *; }
